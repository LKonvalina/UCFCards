import Table from "../models/Table.js";
import Player from "../models/Player.js";
import Leaderboard from "../models/Leaderboard.js";
import TablePlayerRound from "../models/TablePlayerRound.js";
import { STARTING_CHIPS, TURN_DURATION_SECONDS } from "../config/gameConstants.js";
import { deriveInitials, derivePlayerName, mapOutcomeToGameResult } from "../game/gameState.js";

const mapResultToOutcome = (result) => {
  const map = {
    Win: "win",
    Lose: "lose",
    Push: "push",
    Bust: "lose"
  };
  return map[result] ?? null;
};

export const assembleTableView = (table, playerRounds, leaderboardRows, players) => {
  const playerMap = new Map(players.map((player) => [player.userId, player]));
  const leaderboardMap = new Map(leaderboardRows.map((entry) => [entry.playerId, entry]));

  const playerProfiles = table.joinedPlayers.map((userId) => {
    const profile = playerMap.get(userId);
    const leaderboard = leaderboardMap.get(userId);
    const name = profile?.name ?? derivePlayerName(userId);

    return {
      userId,
      name,
      initials: profile?.initials ?? deriveInitials(name),
      chips: leaderboard?.chips ?? STARTING_CHIPS
    };
  });

  const playersInRound = [...playerRounds]
    .sort((left, right) => left.seatIndex - right.seatIndex)
    .map((round) => ({
      userId: round.playerId,
      hand: round.hand,
      status: round.status
    }));

  const results =
    table.status === "finished"
      ? playerRounds
          .filter((round) => round.result)
          .map((round) => ({
            userId: round.playerId,
            outcome: mapResultToOutcome(round.result)
          }))
          .filter((entry) => entry.outcome)
      : [];

  return {
    ...table.toObject(),
    players: playersInRound,
    playerProfiles,
    results
  };
};

export const loadTableContext = async (tableId) => {
  const table = await Table.findById(tableId);
  if (!table) return null;

  const [playerRounds, leaderboardRows, players] = await Promise.all([
    TablePlayerRound.find({ tableId: table._id }).sort({ seatIndex: 1 }),
    Leaderboard.find({ tableId: table._id }),
    Player.find({ userId: { $in: table.joinedPlayers } })
  ]);

  return {
    table,
    playerRounds,
    leaderboardRows,
    players,
    view: assembleTableView(table, playerRounds, leaderboardRows, players)
  };
};

const upsertPlayerDocument = async (userId, name) => {
  const displayName = derivePlayerName(userId, name);
  return Player.findOneAndUpdate(
    { userId },
    {
      userId,
      name: displayName,
      initials: deriveInitials(displayName)
    },
    { upsert: true, returnDocument: "after" }
  );
};

const upsertLeaderboardEntry = async (tableId, playerId, chips = STARTING_CHIPS) =>
  Leaderboard.findOneAndUpdate(
    { tableId, playerId },
    { tableId, playerId, chips },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

export const ensureSeatedPlayer = async (table, userId, name) => {
  await upsertPlayerDocument(userId, name);
  await upsertLeaderboardEntry(table._id, userId);
};

export const removeSeatedPlayerData = async (tableId, playerId) => {
  await Promise.all([
    Leaderboard.deleteOne({ tableId, playerId }),
    TablePlayerRound.deleteOne({ tableId, playerId })
  ]);
};

export const clearTableRound = async (tableId) => {
  await TablePlayerRound.deleteMany({ tableId });
};

export const replacePlayerRounds = async (tableId, roundPlayers) => {
  await clearTableRound(tableId);

  if (!roundPlayers.length) return [];

  const docs = roundPlayers.map((player, seatIndex) => ({
    tableId,
    playerId: player.userId,
    seatIndex,
    hand: player.hand,
    status: player.status,
    result: null
  }));

  return TablePlayerRound.insertMany(docs);
};

const syncPlayerRoundResults = async (tableId, view) => {
  const updates = view.players.map((player, seatIndex) => {
    const outcome = view.results.find((entry) => entry.userId === player.userId)?.outcome ?? null;
    const result = mapOutcomeToGameResult(outcome, player.status);

    return TablePlayerRound.updateOne(
      { tableId, playerId: player.userId },
      {
        seatIndex,
        hand: player.hand,
        status: player.status,
        result
      }
    );
  });

  await Promise.all(updates);
};

const syncLeaderboardChips = async (tableId, view) => {
  const updates = view.playerProfiles.map((profile) =>
    Leaderboard.updateOne({ tableId, playerId: profile.userId }, { chips: profile.chips })
  );

  await Promise.all(updates);
};

export const persistTableContext = async (ctx) => {
  const { table, view } = ctx;

  table.status = view.status;
  table.joinedPlayers = view.joinedPlayers;
  table.deckId = view.deckId;
  table.deckRemaining = view.deckRemaining;
  table.dealerHand = view.dealerHand;
  table.turnIndex = view.turnIndex;
  table.phase = view.phase;
  table.turnStartedAt = view.turnStartedAt;
  table.turnExpiresAt = view.turnExpiresAt;
  table.turnDurationSeconds = view.turnDurationSeconds ?? TURN_DURATION_SECONDS;
  table.message = view.message;
  table.roundNumber = view.roundNumber ?? table.roundNumber;

  await table.save();
  await syncPlayerRoundResults(table._id, view);
  await syncLeaderboardChips(table._id, view);

  ctx.view = assembleTableView(
    table,
    await TablePlayerRound.find({ tableId: table._id }).sort({ seatIndex: 1 }),
    await Leaderboard.find({ tableId: table._id }),
    await Player.find({ userId: { $in: table.joinedPlayers } })
  );

  return ctx;
};

export const loadTableContextByTable = async (table) => loadTableContext(table._id);

export const mutateViewFromRound = (view, round) => {
  view.status = "in_progress";
  view.phase = round.phase;
  view.deckId = round.deckId;
  view.deckRemaining = round.deckRemaining;
  view.players = round.players;
  view.dealerHand = round.dealerHand;
  view.turnIndex = round.turnIndex;
  view.results = [];
  view.turnStartedAt = null;
  view.turnExpiresAt = null;
  view.message = "New hand dealt";
  view.roundNumber = (view.roundNumber ?? 0) + 1;
};

export const applyRoundResultsToView = (view, resolved) => {
  view.players = resolved.players;
  view.dealerHand = resolved.dealerHand;
  view.deckId = resolved.deckId;
  view.deckRemaining = resolved.deckRemaining;
  view.phase = "finished";
  view.status = "finished";
  view.results = resolved.results;
  view.turnStartedAt = null;
  view.turnExpiresAt = null;
  view.message = "Round complete";
};
