import {
  advanceTurn,
  calculateHandValue,
  drawCard,
  initializeRound,
  resolveDealer
} from "../game/blackjack.js";
import {
  applyChipResults,
  buildGameState,
  buildLeaderboard
} from "../game/gameState.js";
import { TURN_DURATION_SECONDS } from "../config/gameConstants.js";
import {
  applyRoundResultsToView,
  clearTableRound,
  ensureSeatedPlayer,
  loadTableContext,
  loadTableContextByTable,
  mutateViewFromRound,
  persistTableContext,
  removeSeatedPlayerData,
  replacePlayerRounds
} from "./tableStore.js";
import { clearTurnTimer, scheduleTurnTimer, startTurnClock } from "./turnTimer.js";
import { createSocketAuthMiddleware, resolveSocketUserId } from "../middleware/socketAuth.js";

const emitError = (io, socket, message) => {
  socket.emit("error", { message });
};

const tableIdFrom = (ctx) => ctx.table._id.toString();

const emitTableState = (io, ctx) => {
  const state = buildGameState(ctx.view);
  io.to(`table:${tableIdFrom(ctx)}`).emit("table:state", state);
  return state;
};

const emitTurnStarted = (io, ctx) => {
  const view = ctx.view;
  io.to(`table:${tableIdFrom(ctx)}`).emit("turn:started", {
    currentPlayerId: view.players[view.turnIndex]?.userId ?? null,
    currentPlayerIndex: view.turnIndex,
    turnStartedAt: view.turnStartedAt ? new Date(view.turnStartedAt).toISOString() : null,
    turnExpiresAt: view.turnExpiresAt ? new Date(view.turnExpiresAt).toISOString() : null,
    turnDurationSeconds: view.turnDurationSeconds ?? TURN_DURATION_SECONDS
  });
};

const emitLeaderboard = (io, ctx) => {
  io.to(`table:${tableIdFrom(ctx)}`).emit("leaderboard:updated", {
    leaderboard: buildLeaderboard(ctx.view)
  });
};

const beginPlayerTurn = (io, ctx) => {
  const view = ctx.view;
  if (view.phase !== "player_turns") return;

  const current = view.players[view.turnIndex];
  if (!current || current.status !== "playing") return;

  startTurnClock(ctx.table);
  view.turnStartedAt = ctx.table.turnStartedAt;
  view.turnExpiresAt = ctx.table.turnExpiresAt;
  view.message = `${current.userId}'s turn`;
  emitTurnStarted(io, ctx);

  scheduleTurnTimer(tableIdFrom(ctx), view.turnExpiresAt, async (tableId) => {
    await handleTurnExpired(io, tableId);
  });
};

const resolveDealerPhase = async (ctx) => {
  const view = ctx.view;
  view.message = "Dealer reveals and draws";
  const resolved = await resolveDealer(view);
  applyRoundResultsToView(view, resolved);
  applyChipResults(view, resolved.results);
  return ctx;
};

const syncPhaseAfterPlayerRemoval = (view) => {
  if (view.phase !== "player_turns") return;

  const hasPlaying = view.players.some((player) => player.status === "playing");
  if (!hasPlaying) {
    view.phase = "dealer_turn";
    view.turnIndex = view.players.length;
    return;
  }

  if (view.turnIndex >= view.players.length || view.players[view.turnIndex].status !== "playing") {
    let idx = Math.min(view.turnIndex, view.players.length - 1);
    while (idx < view.players.length && view.players[idx].status !== "playing") {
      idx += 1;
    }
    if (idx >= view.players.length) {
      view.phase = "dealer_turn";
      view.turnIndex = view.players.length;
    } else {
      view.turnIndex = idx;
    }
  }
};

const removePlayerFromActiveRound = (view, userId) => {
  const leavingIndex = view.players.findIndex((player) => player.userId === userId);
  if (leavingIndex === -1) return false;

  view.players.splice(leavingIndex, 1);
  if (view.turnIndex > leavingIndex) {
    view.turnIndex -= 1;
  }
  syncPhaseAfterPlayerRemoval(view);
  return true;
};

const closeTournamentTable = async (io, ctx) => {
  const tableId = tableIdFrom(ctx);
  clearTurnTimer(tableId);
  ctx.view.status = "closed";
  ctx.view.phase = "finished";
  ctx.view.turnStartedAt = null;
  ctx.view.turnExpiresAt = null;
  ctx.view.joinedPlayers = [];
  ctx.view.players = [];
  ctx.view.dealerHand = [];
  ctx.view.results = [];
  ctx.view.message = "Tournament round ended — all players left";
  await clearTableRound(ctx.table._id);
  await persistTableContext(ctx);
  io.to(`table:${tableId}`).emit("tournament:ended", {
    tableId,
    message: ctx.view.message
  });
  emitTableState(io, ctx);
  return ctx;
};

const advanceAfterLeave = async (io, ctx) => {
  const tableId = tableIdFrom(ctx);
  const view = ctx.view;

  if (view.phase === "dealer_turn") {
    await resolveDealerPhase(ctx);
    clearTurnTimer(tableId);
    await persistTableContext(ctx);
    emitTableState(io, ctx);
    emitLeaderboard(io, ctx);
    io.to(`table:${tableId}`).emit("round:complete", {
      tableId,
      state: buildGameState(ctx.view)
    });
    return ctx;
  }

  if (view.phase === "player_turns") {
    await persistTableContext(ctx);
    emitTableState(io, ctx);
    beginPlayerTurn(io, ctx);
    await persistTableContext(ctx);
    emitTableState(io, ctx);
    return ctx;
  }

  await persistTableContext(ctx);
  emitTableState(io, ctx);
  emitLeaderboard(io, ctx);
  return ctx;
};

const advanceAfterAction = async (io, ctx) => {
  const tableId = tableIdFrom(ctx);
  const view = ctx.view;

  if (view.phase === "dealer_turn") {
    await resolveDealerPhase(ctx);
    clearTurnTimer(tableId);
    await persistTableContext(ctx);
    emitTableState(io, ctx);
    emitLeaderboard(io, ctx);
    io.to(`table:${tableId}`).emit("round:complete", {
      tableId,
      state: buildGameState(ctx.view)
    });
    return ctx;
  }

  await persistTableContext(ctx);
  emitTableState(io, ctx);
  beginPlayerTurn(io, ctx);
  await persistTableContext(ctx);
  emitTableState(io, ctx);
  return ctx;
};

export const startRoundForTable = async (io, tableDoc) => {
  const ctx = await loadTableContextByTable(tableDoc);
  const view = ctx.view;

  if (view.status === "closed") {
    throw new Error("This tournament round has ended.");
  }
  if (view.joinedPlayers.length < view.expectedPlayers) {
    throw new Error("Not enough players to start the round.");
  }
  if (!["waiting", "finished"].includes(view.status)) {
    throw new Error("A round is already in progress.");
  }
  if (view.status === "finished" && view.roundNumber >= view.rounds) {
    throw new Error("This tournament has completed all scheduled rounds.");
  }

  clearTurnTimer(tableIdFrom(ctx));

  const round = await initializeRound(view.joinedPlayers);
  mutateViewFromRound(view, round);
  await replacePlayerRounds(ctx.table._id, view.players);
  await persistTableContext(ctx);

  const tableId = tableIdFrom(ctx);
  io.to(`table:${tableId}`).emit("round:start", { tableId });
  emitTableState(io, ctx);
  beginPlayerTurn(io, ctx);
  await persistTableContext(ctx);
  emitTableState(io, ctx);
  return ctx;
};

export const joinTablePlayer = async (io, tableId, userId, name) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx) throw new Error("Table not found.");

  const view = ctx.view;
  if (view.status === "closed") {
    throw new Error("This tournament round has ended.");
  }

  const isAlreadySeated = view.joinedPlayers.includes(userId);

  if (!isAlreadySeated) {
    if (view.status !== "waiting") {
      throw new Error("Game already started.");
    }
    if (view.joinedPlayers.length >= view.expectedPlayers) {
      throw new Error("Table is already full.");
    }
    view.joinedPlayers.push(userId);
    ctx.table.joinedPlayers = view.joinedPlayers;
    view.message = `${userId} joined the table`;
  } else {
    view.message = `${userId} rejoined the table`;
  }

  await ensureSeatedPlayer(ctx.table, userId, name);
  await persistTableContext(ctx);

  io.to(`table:${tableId}`).emit("table:join", { tableId, userId, rejoin: isAlreadySeated });
  emitTableState(io, ctx);
  emitLeaderboard(io, ctx);
  return ctx;
};

export const leaveTablePlayer = async (io, tableId, userId) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx) return null;

  const view = ctx.view;

  if (view.status !== "waiting") {
    view.message = `${userId} disconnected`;
    await persistTableContext(ctx);
    io.to(`table:${tableId}`).emit("table:leave", { tableId, userId, disconnected: true });
    emitTableState(io, ctx);
    return ctx;
  }

  view.joinedPlayers = view.joinedPlayers.filter((id) => id !== userId);
  ctx.table.joinedPlayers = view.joinedPlayers;
  view.message = `${userId} left the table`;
  await removeSeatedPlayerData(ctx.table._id, userId);

  if (view.joinedPlayers.length === 0) {
    return closeTournamentTable(io, ctx);
  }

  await persistTableContext(ctx);
  io.to(`table:${tableId}`).emit("table:leave", { tableId, userId });
  emitTableState(io, ctx);
  emitLeaderboard(io, ctx);
  return ctx;
};

export const exitTablePlayer = async (io, tableId, userId) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx) throw new Error("Table not found.");

  const view = ctx.view;
  if (view.status === "closed") {
    throw new Error("This tournament round has ended.");
  }
  if (!view.joinedPlayers.includes(userId)) {
    throw new Error("You are not seated at this table.");
  }

  clearTurnTimer(tableId);

  view.joinedPlayers = view.joinedPlayers.filter((id) => id !== userId);
  ctx.table.joinedPlayers = view.joinedPlayers;
  await removeSeatedPlayerData(ctx.table._id, userId);

  const wasInProgress = view.status === "in_progress";
  if (wasInProgress) {
    removePlayerFromActiveRound(view, userId);
  }

  view.message = `${userId} left the table`;

  if (view.joinedPlayers.length === 0) {
    return closeTournamentTable(io, ctx);
  }

  await persistTableContext(ctx);
  io.to(`table:${tableId}`).emit("table:leave", { tableId, userId, exited: true });

  if (wasInProgress) {
    return advanceAfterLeave(io, ctx);
  }

  await persistTableContext(ctx);
  emitTableState(io, ctx);
  emitLeaderboard(io, ctx);
  return ctx;
};

export const playerHit = async (io, tableId, userId) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx) throw new Error("Table not found.");

  const view = ctx.view;
  if (view.phase !== "player_turns") throw new Error("Player action phase is over.");

  const player = view.players[view.turnIndex];
  if (!player || player.userId !== userId) throw new Error("It is not your turn.");

  clearTurnTimer(tableId);
  const drawn = await drawCard(view);
  player.hand.push(drawn.card);
  view.deckId = drawn.deckId;
  view.deckRemaining = drawn.deckRemaining;
  view.message = `${userId} hit`;

  if (calculateHandValue(player.hand) > 21) {
    player.status = "busted";
    const advanced = advanceTurn(view);
    view.turnIndex = advanced.turnIndex;
    view.phase = advanced.phase;
  }

  await advanceAfterAction(io, ctx);
  return ctx;
};

export const playerStand = async (io, tableId, userId) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx) throw new Error("Table not found.");

  const view = ctx.view;
  if (view.phase !== "player_turns") throw new Error("Player action phase is over.");

  const player = view.players[view.turnIndex];
  if (!player || player.userId !== userId) throw new Error("It is not your turn.");

  clearTurnTimer(tableId);
  player.status = "stood";
  view.message = `${userId} stands`;
  const advanced = advanceTurn(view);
  view.turnIndex = advanced.turnIndex;
  view.phase = advanced.phase;

  await advanceAfterAction(io, ctx);
  return ctx;
};

export const handleTurnExpired = async (io, tableId) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx || ctx.view.phase !== "player_turns") return null;

  const view = ctx.view;
  const player = view.players[view.turnIndex];
  if (!player || player.status !== "playing") return null;

  player.status = "stood";
  view.message = `${player.userId}'s turn expired`;
  const advanced = advanceTurn(view);
  view.turnIndex = advanced.turnIndex;
  view.phase = advanced.phase;

  io.to(`table:${tableId}`).emit("turn:expired", {
    tableId,
    currentPlayerId: player.userId
  });

  await advanceAfterAction(io, ctx);
  return ctx;
};

export const getTableSnapshot = async (tableId, userId) => {
  const ctx = await loadTableContext(tableId);
  if (!ctx) throw new Error("Table not found.");

  if (ctx.view.status === "closed") {
    throw new Error("This tournament round has ended.");
  }
  if (!ctx.view.joinedPlayers.includes(userId)) {
    throw new Error("You are not seated at this table.");
  }

  return {
    table: ctx.table,
    view: ctx.view,
    gameState: buildGameState(ctx.view, userId),
    leaderboard: buildLeaderboard(ctx.view)
  };
};

export const registerTableGame = (io) => {
  io.use(createSocketAuthMiddleware());

  io.on("connection", (socket) => {
    socket.on("table:join", async ({ tableId, userId, name }) => {
      try {
        if (!tableId) throw new Error("tableId is required.");
        const authenticatedUserId = resolveSocketUserId(socket, userId);
        socket.join(`table:${tableId}`);
        socket.data.tableId = tableId;
        socket.data.userId = authenticatedUserId;
        await joinTablePlayer(io, tableId, authenticatedUserId, name);
      } catch (error) {
        emitError(io, socket, error.message);
      }
    });

    socket.on("round:start", async ({ tableId, userId }) => {
      try {
        const authenticatedUserId = resolveSocketUserId(socket, userId);
        const ctx = await loadTableContext(tableId);
        if (!ctx) throw new Error("Table not found.");
        if (ctx.view.hostUserId !== authenticatedUserId) throw new Error("Only the host can deal the next hand.");
        if (!["waiting", "finished"].includes(ctx.view.status)) {
          throw new Error("A round is already in progress.");
        }
        await startRoundForTable(io, ctx.table);
      } catch (error) {
        emitError(io, socket, error.message);
      }
    });

    socket.on("player:hit", async ({ tableId, userId }) => {
      try {
        const authenticatedUserId = resolveSocketUserId(socket, userId);
        await playerHit(io, tableId, authenticatedUserId);
      } catch (error) {
        emitError(io, socket, error.message);
      }
    });

    socket.on("player:stand", async ({ tableId, userId }) => {
      try {
        const authenticatedUserId = resolveSocketUserId(socket, userId);
        await playerStand(io, tableId, authenticatedUserId);
      } catch (error) {
        emitError(io, socket, error.message);
      }
    });

    socket.on("table:leave", async ({ tableId, userId }) => {
      try {
        if (!tableId) throw new Error("tableId is required.");
        const authenticatedUserId = resolveSocketUserId(socket, userId);
        await exitTablePlayer(io, tableId, authenticatedUserId);
        socket.leave(`table:${tableId}`);
        delete socket.data.tableId;
        delete socket.data.userId;
      } catch (error) {
        emitError(io, socket, error.message);
      }
    });

    socket.on("disconnect", async () => {
      const { tableId, userId } = socket.data;
      if (tableId && userId) {
        await leaveTablePlayer(io, tableId, userId);
      }
    });
  });
};
