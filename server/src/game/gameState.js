import { calculateHandValue } from "./blackjack.js";
import { CHIP_LOSE, CHIP_WIN, STARTING_CHIPS, TURN_DURATION_SECONDS } from "../config/gameConstants.js";

export const deriveInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "P";

export const derivePlayerName = (userId, providedName) =>
  providedName?.trim() || `Player ${userId.slice(-4)}`;

const mapPhase = (phase) => {
  if (phase === "player_turns") return "player-turn";
  if (phase === "dealer_turn") return "dealer-turn";
  if (phase === "finished") return "round-complete";
  return "player-turn";
};

export const mapOutcomeToGameResult = (outcome, playerStatus = null) => {
  if (playerStatus === "busted") return "Bust";
  if (!outcome) return null;

  const map = {
    win: "Win",
    lose: "Lose",
    push: "Push"
  };

  return map[outcome] ?? null;
};

const getPlayerResult = (table, userId, playerStatus) => {
  const outcome = table.results?.find((entry) => entry.userId === userId)?.outcome ?? null;
  return mapOutcomeToGameResult(outcome, playerStatus);
};

const mapPlayerStatus = (table, player, playerIndex, currentUserId) => {
  if (table.status === "waiting") return "Waiting";

  const isCurrentTurn =
    table.phase === "player_turns" && table.turnIndex === playerIndex && player.status === "playing";

  if (table.phase === "finished") return "Complete";
  if (player.status === "busted") return "Bust";
  if (player.status === "stood") return "Standing";
  if (isCurrentTurn && player.userId === currentUserId) return "Your Turn";
  if (player.status === "playing") return "Playing";
  return "Waiting";
};

const getProfile = (table, userId) =>
  table.playerProfiles?.find((profile) => profile.userId === userId) ?? {
    userId,
    name: derivePlayerName(userId),
    initials: deriveInitials(derivePlayerName(userId)),
    chips: STARTING_CHIPS
  };

export const buildGameState = (table, currentUserId = null) => {
  const plain = table.toObject ? table.toObject() : table;
  const revealDealer = plain.phase === "dealer_turn" || plain.phase === "finished";
  const currentPlayer = plain.players[plain.turnIndex] ?? null;
  const currentPlayerId =
    plain.phase === "player_turns" && currentPlayer?.status === "playing" ? currentPlayer.userId : null;

  const dealerHand = revealDealer
    ? plain.dealerHand
    : plain.dealerHand.map((card, index) => (index === 0 ? card : { ...card, hidden: true }));

  const players = plain.players.map((player, index) => {
    const profile = getProfile(plain, player.userId);
    return {
      id: player.userId,
      name: profile.name,
      initials: profile.initials,
      chips: profile.chips,
      hand: player.hand,
      handTotal: calculateHandValue(player.hand),
      status: mapPlayerStatus(plain, player, index, currentUserId),
      result: getPlayerResult(plain, player.userId, player.status),
      isCurrentUser: currentUserId ? player.userId === currentUserId : undefined
    };
  });

  const viewerPlayer = plain.players.find((player) => player.userId === currentUserId);
  const viewerResult = currentUserId
    ? getPlayerResult(plain, currentUserId, viewerPlayer?.status ?? null)
    : null;

  return {
    roundNumber: plain.roundNumber ?? 0,
    players,
    dealerHand,
    phase: mapPhase(plain.phase),
    currentPlayerId,
    currentPlayerIndex: currentPlayerId ? plain.turnIndex : -1,
    turnStartedAt: plain.turnStartedAt ? new Date(plain.turnStartedAt).toISOString() : null,
    turnExpiresAt: plain.turnExpiresAt ? new Date(plain.turnExpiresAt).toISOString() : null,
    turnDurationSeconds: plain.turnDurationSeconds ?? TURN_DURATION_SECONDS,
    result: plain.phase === "finished" ? viewerResult : null,
    message: plain.message || ""
  };
};

export const buildLeaderboard = (table) => {
  const plain = table.toObject ? table.toObject() : table;
  return [...(plain.playerProfiles || [])]
    .map((profile) => ({
      id: profile.userId,
      name: profile.name,
      initials: profile.initials,
      chips: profile.chips
    }))
    .sort((a, b) => b.chips - a.chips);
};

export const applyChipResults = (table, results) => {
  for (const outcome of results) {
    const profile = table.playerProfiles.find((entry) => entry.userId === outcome.userId);
    if (!profile) continue;
    if (outcome.outcome === "win") profile.chips += CHIP_WIN;
    if (outcome.outcome === "lose") profile.chips -= CHIP_LOSE;
  }
};
