import { apiRequest } from './http';
import {
  joinTableRoom,
  leaveTableRoom,
  setTableSocketHandlers,
  disconnectSocket,
} from './socket';
import {
  mapLeaderboardRows,
  mapLobbyResponse,
  mapServerGameState,
  type ServerGameState,
  type ServerTableLobby,
  type TableSessionMeta,
} from './mappers';
import type { GameState, LeaderboardEntry, OpenTable, Tournament, TournamentInput, User } from '../types';

type TableUpdateListener = (payload: {
  game: GameState | null;
  leaderboard: LeaderboardEntry[];
  tournament?: Tournament;
}) => void;

let currentUser: User | null = null;
let tableId: string | null = null;
let tableMeta: TableSessionMeta | null = null;
let updateListener: TableUpdateListener | null = null;

function requireUser(): User {
  if (!currentUser) {
    throw new Error('User is not authenticated.');
  }

  return currentUser;
}

function requireTableSession() {
  const user = requireUser();

  if (!tableId || !tableMeta) {
    throw new Error('No active table session.');
  }

  return { user, tableId, meta: tableMeta };
}

function clampPlayerCount(playerCount: number) {
  return Math.min(5, Math.max(1, playerCount));
}

function publishSocketUpdate(state: ServerGameState) {
  if (!updateListener || !tableId || !tableMeta || !currentUser) {
    return;
  }

  const game = state.players.length > 0 ? mapServerGameState(state, tableId, tableMeta, currentUser.id) : null;

  updateListener({
    game,
    leaderboard: [],
  });
}

function bindSocketSession(user: User) {
  if (!tableId) return;

  setTableSocketHandlers({
    onGameState: (state) => {
      publishSocketUpdate(state);
    },
    onLeaderboard: async () => {
      if (!updateListener || !tableMeta || !currentUser || !tableId) return;

      const lobby = await fetchTableLobby(tableId);
      const mapped = mapLobbyResponse(lobby, tableMeta, currentUser);
      updateListener(mapped);
    },
    onError: (message) => {
      console.error(message);
    },
  });

  void joinTableRoom(tableId, user.id, user.name);
}

async function fetchTableLobby(id: string) {
  return apiRequest<ServerTableLobby>(`/tables/${id}`);
}

async function joinTable(id: string, user: User, name?: string) {
  return apiRequest<ServerTableLobby>(`/tables/${id}/join`, {
    method: 'POST',
    body: { name: name ?? user.name },
  });
}

function clearTableSession() {
  tableId = null;
  tableMeta = null;
  setTableSocketHandlers(null);
}

export const apiClient = {
  setSessionUser(user: User): void {
    currentUser = { ...user };
  },

  clearSessionUser(): void {
    if (tableId && currentUser) {
      leaveTableRoom(tableId, currentUser.id);
    }

    currentUser = null;
    clearTableSession();
    disconnectSocket();
  },

  setTableUpdateListener(listener: TableUpdateListener | null) {
    updateListener = listener;
  },

  async syncCurrentUser(): Promise<User> {
    const user = await apiRequest<User>('/users/me');
    currentUser = user;
    return user;
  },

  async createTournament(input: TournamentInput): Promise<{
    tournament: Tournament;
    game: GameState | null;
    leaderboard: LeaderboardEntry[];
  }> {
    const user = requireUser();
    const playerCount = clampPlayerCount(input.playerCount);

    const created = await apiRequest<{ tableId: string }>('/tables', {
      method: 'POST',
      body: {
        playerCount,
        name: input.name,
        startingChips: input.startingChips,
        rounds: input.rounds,
        displayName: user.name,
      },
    });

    tableId = created.tableId;
    tableMeta = {
      name: input.name.trim() || 'Blackjack Academy Open',
      startingChips: input.startingChips,
      rounds: input.rounds,
      createdAt: new Date().toISOString(),
      roundNumber: 0,
    };

    const lobby = await joinTable(tableId, user);
    bindSocketSession(user);

    const mapped = mapLobbyResponse(lobby, tableMeta, user);

    if (lobby.status === 'in_progress') {
      tableMeta.roundNumber = 1;
      mapped.game = mapServerGameState(lobby.gameState, tableId, tableMeta, user.id);
    }

    return mapped;
  },

  async listOpenTables(): Promise<OpenTable[]> {
    requireUser();
    const response = await apiRequest<{ tables: OpenTable[] }>('/tables/open');
    return response.tables;
  },

  async joinDiscoveredTable(openTable: OpenTable): Promise<{
    tournament: Tournament;
    game: GameState | null;
    leaderboard: LeaderboardEntry[];
  }> {
    const user = requireUser();

    tableId = openTable.id;
    tableMeta = {
      name: openTable.name,
      startingChips: openTable.startingChips,
      rounds: openTable.rounds,
      createdAt: openTable.createdAt,
      roundNumber: 0,
    };

    const lobby = await joinTable(tableId, user);
    bindSocketSession(user);

    const mapped = mapLobbyResponse(lobby, tableMeta, user);

    if (lobby.status === 'in_progress') {
      tableMeta.roundNumber = 1;
      mapped.game = mapServerGameState(lobby.gameState, tableId, tableMeta, user.id);
    }

    return mapped;
  },

  async refreshTable(): Promise<{
    tournament: Tournament;
    game: GameState | null;
    leaderboard: LeaderboardEntry[];
  }> {
    const { user, tableId: activeTableId, meta } = requireTableSession();
    const lobby = await fetchTableLobby(activeTableId);
    return mapLobbyResponse(lobby, meta, user);
  },

  async startRound(): Promise<GameState> {
    const { user, tableId: activeTableId, meta } = requireTableSession();

    const lobby = await apiRequest<ServerTableLobby>(`/tables/${activeTableId}/round/start`, {
      method: 'POST',
    });

    meta.roundNumber += 1;
    return mapServerGameState(lobby.gameState, activeTableId, meta, user.id);
  },

  async hit(): Promise<GameState> {
    const { user, tableId: activeTableId, meta } = requireTableSession();

    const lobby = await apiRequest<ServerTableLobby>(`/tables/${activeTableId}/action`, {
      method: 'POST',
      body: { action: 'hit' },
    });

    return mapServerGameState(lobby.gameState, activeTableId, meta, user.id);
  },

  async stand(): Promise<GameState> {
    const { user, tableId: activeTableId, meta } = requireTableSession();

    const lobby = await apiRequest<ServerTableLobby>(`/tables/${activeTableId}/action`, {
      method: 'POST',
      body: { action: 'stand' },
    });

    return mapServerGameState(lobby.gameState, activeTableId, meta, user.id);
  },

  async resolveCurrentTurn(): Promise<GameState | null> {
    const { user, tableId: activeTableId, meta } = requireTableSession();
    const lobby = await fetchTableLobby(activeTableId);

    if (lobby.gameState.players.length === 0) {
      return null;
    }

    return mapServerGameState(lobby.gameState, activeTableId, meta, user.id);
  },

  async newRound(): Promise<GameState> {
    return this.startRound();
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!currentUser || !tableId || !tableMeta) {
      return [];
    }

    const lobby = await fetchTableLobby(tableId);
    return mapLeaderboardRows(lobby.leaderboard, currentUser.id, lobby.joinedPlayers);
  },

  async leaveTable(): Promise<{ status: string; message?: string }> {
    const { tableId: activeTableId } = requireTableSession();

    const response = await apiRequest<{ tableId: string; status: string; message?: string }>(
      `/tables/${activeTableId}/leave`,
      { method: 'POST' },
    );

    clearTableSession();
    return response;
  },
};
