import express from "express";
import Table from "../models/Table.js";
import TournamentSchedule from "../models/TournamentSchedule.js";
import { requireUser } from "../middleware/auth.js";
import { buildGameState, buildLeaderboard } from "../game/gameState.js";
import { ensureSeatedPlayer } from "../services/tableStore.js";
import { seatBots } from "../game/bots.js";
import { listJoinableTables } from "../services/openTables.js";
import {
  exitTablePlayer,
  getTableSnapshot,
  joinTablePlayer,
  playerHit,
  playerStand,
  startRoundForTable
} from "../services/tableGame.js";

const router = express.Router();

const withLobby = (ctx, currentUserId) => {
  const view = ctx.view ?? ctx;
  const tableDoc = ctx.table ?? ctx;

  return {
    id: tableDoc._id,
    hostUserId: view.hostUserId,
    expectedPlayers: view.expectedPlayers,
    joinedPlayers: view.joinedPlayers,
    status: view.status,
    leaderboard: buildLeaderboard(view),
    gameState: buildGameState(view, currentUserId)
  };
};

router.post("/", requireUser, async (req, res) => {
  const requestedCount = Number(req.body.playerCount);
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 5) {
    return res.status(400).json({ message: "Player count must be an integer between 1 and 5." });
  }

  const requestedRounds = Number(req.body.rounds);
  const rounds = [3, 5, 10].includes(requestedRounds) ? requestedRounds : 5;
  const startingChips = Number.isFinite(Number(req.body.startingChips))
    ? Math.max(100, Number(req.body.startingChips))
    : 1000;

  const table = await Table.create({
    hostUserId: req.userId,
    name: typeof req.body.name === "string" && req.body.name.trim() ? req.body.name.trim() : "Blackjack Academy Open",
    startingChips,
    rounds,
    expectedPlayers: requestedCount,
    joinedPlayers: [req.userId]
  });
  await ensureSeatedPlayer(table, req.userId, req.body?.displayName ?? req.body?.name);

  if (Array.isArray(req.body.bots) && req.body.bots.length > 0) {
    await seatBots(table, req.body.bots);
  }

  return res.status(201).json({ tableId: table._id });
});

router.get("/open", requireUser, async (req, res) => {
  const tables = await listJoinableTables(req.userId);
  return res.json({ tables });
});

router.post("/:tableId/join", requireUser, async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const ctx = await joinTablePlayer(io, req.params.tableId, req.userId, req.body?.name);

    if (ctx.view.joinedPlayers.length === ctx.view.expectedPlayers && ctx.view.status === "waiting") {
      await startRoundForTable(io, ctx.table);
      const snapshot = await getTableSnapshot(req.params.tableId, req.userId);
      return res.json(withLobby(snapshot, req.userId));
    }

    return res.json(withLobby(ctx, req.userId));
  } catch (error) {
    next(error);
  }
});

router.post("/:tableId/round/start", requireUser, async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.tableId);
    if (!table) return res.status(404).json({ message: "Table not found." });
    if (table.hostUserId !== req.userId) {
      return res.status(403).json({ message: "Only the host can deal the next hand." });
    }
    if (!table.joinedPlayers.includes(req.userId)) {
      return res.status(403).json({ message: "You are not seated at this table." });
    }

    const io = req.app.get("io");
    const ctx = await startRoundForTable(io, table);
    return res.json(withLobby(ctx, req.userId));
  } catch (error) {
    next(error);
  }
});

router.post("/:tableId/leave", requireUser, async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const ctx = await exitTablePlayer(io, req.params.tableId, req.userId);
    return res.json({
      tableId: ctx.table._id,
      status: ctx.view.status,
      message: ctx.view.message
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:tableId", requireUser, async (req, res) => {
  const snapshot = await getTableSnapshot(req.params.tableId, req.userId);
  return res.json(withLobby(snapshot, req.userId));
});

router.post("/:tableId/action", requireUser, async (req, res) => {
  const { action } = req.body;
  if (!["hit", "stand"].includes(action)) {
    return res.status(400).json({ message: "Invalid action." });
  }

  const io = req.app.get("io");
  const ctx =
    action === "hit"
      ? await playerHit(io, req.params.tableId, req.userId)
      : await playerStand(io, req.params.tableId, req.userId);

  return res.json(withLobby(ctx, req.userId));
});

router.post("/:tableId/schedule", requireUser, async (req, res) => {
  const table = await Table.findById(req.params.tableId);
  if (!table) return res.status(404).json({ message: "Table not found." });
  if (table.hostUserId !== req.userId) {
    return res.status(403).json({ message: "Only the table host can schedule tournaments." });
  }

  const scheduledStart = new Date(req.body.scheduledStart);
  const scheduledEnd = new Date(req.body.scheduledEnd || scheduledStart.getTime() + 60 * 60 * 1000);

  if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
    return res.status(400).json({ message: "Invalid schedule dates." });
  }
  if (scheduledEnd <= scheduledStart) {
    return res.status(400).json({ message: "End time must be after start time." });
  }

  const schedule = await TournamentSchedule.findOneAndUpdate(
    { tableId: table._id },
    {
      tableId: table._id,
      hostUserId: table.hostUserId,
      scheduledStart,
      scheduledEnd,
      playerIds: table.joinedPlayers
    },
    { upsert: true, returnDocument: "after" }
  );

  return res.status(201).json({
    scheduleId: schedule._id,
    tableId: table._id,
    scheduledStart: schedule.scheduledStart,
    scheduledEnd: schedule.scheduledEnd
  });
});

router.get("/:tableId/schedule", requireUser, async (req, res) => {
  const table = await Table.findById(req.params.tableId);
  if (!table) return res.status(404).json({ message: "Table not found." });
  if (!table.joinedPlayers.includes(req.userId)) {
    return res.status(403).json({ message: "You are not seated at this table." });
  }

  const schedule = await TournamentSchedule.findOne({ tableId: table._id });
  if (!schedule) {
    return res.json({ scheduled: false });
  }

  return res.json({
    scheduled: true,
    scheduleId: schedule._id,
    scheduledStart: schedule.scheduledStart,
    scheduledEnd: schedule.scheduledEnd
  });
});

export default router;
