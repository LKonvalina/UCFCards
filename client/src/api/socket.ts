import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';
import type { ServerGameState, ServerLeaderboardRow } from './mappers';

export type TableSocketHandlers = {
  onGameState: (state: ServerGameState) => void;
  onLeaderboard: (leaderboard: ServerLeaderboardRow[]) => void;
  onError: (message: string) => void;
};

type TokenProvider = () => Promise<string | null>;

let socket: Socket | null = null;
let activeHandlers: TableSocketHandlers | null = null;
let tokenProvider: TokenProvider | null = null;

function attachSocketListeners() {
  if (!socket || !activeHandlers) return;

  socket.off('table:state');
  socket.off('leaderboard:updated');
  socket.off('round:complete');
  socket.off('error');

  socket.on('table:state', (state: ServerGameState) => {
    activeHandlers?.onGameState(state);
  });

  socket.on('leaderboard:updated', ({ leaderboard }: { leaderboard: ServerLeaderboardRow[] }) => {
    activeHandlers?.onLeaderboard(leaderboard);
  });

  socket.on('round:complete', ({ state }: { state: ServerGameState }) => {
    activeHandlers?.onGameState(state);
  });

  socket.on('error', ({ message }: { message: string }) => {
    activeHandlers?.onError(message);
  });
}

async function buildSocketAuth() {
  if (!tokenProvider) {
    return {};
  }

  const token = await tokenProvider();
  return token ? { token } : {};
}

export function setSocketTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;

  if (socket) {
    const activeSocket = socket;
    void buildSocketAuth().then((auth) => {
      activeSocket.auth = auth;
    });
  }
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: async (callback) => {
        callback(await buildSocketAuth());
      },
    });
  }

  return socket;
}

export function setTableSocketHandlers(handlers: TableSocketHandlers | null) {
  activeHandlers = handlers;
  attachSocketListeners();
}

export async function joinTableRoom(tableId: string, userId: string, name: string) {
  const nextSocket = getSocket();

  if (!nextSocket.connected) {
    nextSocket.auth = await buildSocketAuth();
    await new Promise<void>((resolve, reject) => {
      nextSocket.once('connect', () => resolve());
      nextSocket.once('connect_error', (error) => reject(error));
      nextSocket.connect();
    });
  }

  attachSocketListeners();
  nextSocket.emit('table:join', { tableId, userId, name });
}

export function leaveTableRoom(tableId: string, userId: string) {
  if (!socket) return;
  socket.emit('table:leave', { tableId, userId });
}

export function emitRoundStart(tableId: string, userId: string) {
  getSocket().emit('round:start', { tableId, userId });
}

export function emitPlayerHit(tableId: string, userId: string) {
  getSocket().emit('player:hit', { tableId, userId });
}

export function emitPlayerStand(tableId: string, userId: string) {
  getSocket().emit('player:stand', { tableId, userId });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  activeHandlers = null;
}
