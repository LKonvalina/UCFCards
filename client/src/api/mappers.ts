import type {
  GamePhase,
  GameResult,
  GameState,
  LeaderboardEntry,
  Tournament,
  TournamentPlayer,
  TurnStatus,
  User,
} from '../types';
import { chipDeltaForResult } from '../utils/blackjack';

export type ServerCard = {
  code: string;
  value: string;
  suit: 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
  image: string;
  hidden?: boolean;
};

export type ServerTablePlayer = {
  id: string;
  name: string;
  initials: string;
  chips: number;
  hand: ServerCard[];
  handTotal: number;
  status: TurnStatus;
  result: GameResult | null;
  isCurrentUser?: boolean;
};

export type ServerGameState = {
  players: ServerTablePlayer[];
  dealerHand: ServerCard[];
  phase: GamePhase;
  currentPlayerId: string | null;
  currentPlayerIndex: number;
  turnStartedAt: string | null;
  turnExpiresAt: string | null;
  turnDurationSeconds: number;
  result: GameResult | null;
  message: string;
};

export type ServerLeaderboardRow = {
  id: string;
  name: string;
  initials: string;
  chips: number;
};

export type ServerTableLobby = {
  id: string;
  hostUserId: string;
  expectedPlayers: number;
  joinedPlayers: string[];
  status: 'waiting' | 'in_progress' | 'finished' | 'closed';
  leaderboard: ServerLeaderboardRow[];
  gameState: ServerGameState;
};

export type TableSessionMeta = {
  name: string;
  startingChips: number;
  rounds: 3 | 5 | 10;
  createdAt: string;
  roundNumber: number;
};

export function mapLeaderboardRows(
  rows: ServerLeaderboardRow[],
  userId: string | null,
  joinedPlayers: string[],
): LeaderboardEntry[] {
  return [...rows]
    .sort((left, right) => right.chips - left.chips)
    .map((row, index) => ({
      rank: index + 1,
      playerId: row.id,
      player: row.name,
      initials: row.initials,
      chips: row.chips,
      roundsWon: 0,
      status: joinedPlayers.includes(row.id) ? 'Seated' : 'Waiting',
      isCurrentUser: userId ? row.id === userId : undefined,
    }));
}

export function mapTournamentPlayers(
  rows: ServerLeaderboardRow[],
  userId: string,
  joinedPlayers: string[],
  expectedPlayers: number,
): TournamentPlayer[] {
  const players = rows.map((row) => ({
    id: row.id,
    name: row.name,
    initials: row.initials,
    chips: row.chips,
    roundsWon: 0,
    status: joinedPlayers.includes(row.id) ? ('Ready' as const) : ('Waiting' as const),
    isCurrentUser: row.id === userId,
  }));

  while (players.length < expectedPlayers) {
    players.push({
      id: `open-seat-${players.length + 1}`,
      name: `Open Seat ${players.length + 1}`,
      initials: 'OS',
      chips: 0,
      roundsWon: 0,
      status: 'Waiting',
      isCurrentUser: false,
    });
  }

  return players;
}

export function mapLobbyToTournament(
  lobby: ServerTableLobby,
  meta: TableSessionMeta,
  userId: string,
): Tournament {
  return {
    id: String(lobby.id),
    name: meta.name,
    playerCount: lobby.expectedPlayers,
    startingChips: meta.startingChips,
    rounds: meta.rounds,
    createdAt: meta.createdAt,
    players: mapTournamentPlayers(lobby.leaderboard, userId, lobby.joinedPlayers, lobby.expectedPlayers),
  };
}

export function mapServerGameState(
  state: ServerGameState,
  tableId: string,
  meta: TableSessionMeta,
  userId: string,
): GameState {
  const currentUser = state.players.find((player) => player.id === userId) ?? state.players.find((player) => player.isCurrentUser);
  const result = state.result ?? currentUser?.result ?? null;

  return {
    id: tableId,
    tournamentId: tableId,
    roundNumber: meta.roundNumber,
    playerHand: currentUser?.hand ?? [],
    dealerHand: state.dealerHand,
    shoe: [],
    phase: state.phase,
    result,
    message: state.message,
    chipDelta: result ? chipDeltaForResult(result) : 0,
    playerChips: currentUser?.chips ?? meta.startingChips,
    players: state.players,
    currentPlayerId: state.currentPlayerId,
    currentPlayerIndex: state.currentPlayerIndex,
    turnStartedAt: state.turnStartedAt,
    turnExpiresAt: state.turnExpiresAt,
    turnDurationSeconds: state.turnDurationSeconds,
  };
}

export function mapLobbyResponse(
  lobby: ServerTableLobby,
  meta: TableSessionMeta,
  user: User,
): { tournament: Tournament; game: GameState | null; leaderboard: LeaderboardEntry[] } {
  const tournament = mapLobbyToTournament(lobby, meta, user.id);
  const leaderboard = mapLeaderboardRows(lobby.leaderboard, user.id, lobby.joinedPlayers);
  const game =
    lobby.gameState.players.length > 0
      ? mapServerGameState(lobby.gameState, String(lobby.id), meta, user.id)
      : null;

  return { tournament, game, leaderboard };
}
