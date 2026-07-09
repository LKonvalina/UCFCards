import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { apiClient } from '../api/apiClient';
import { setAuthTokenProvider } from '../api/http';
import { setSocketTokenProvider } from '../api/socket';
import type {
  AppView,
  GameState,
  LeaderboardEntry,
  OpenTable,
  Tournament,
  TournamentInput,
  User,
} from '../types';

type AppContextValue = {
  view: AppView;
  user: User | null;
  authReady: boolean;
  tournament: Tournament | null;
  game: GameState | null;
  leaderboard: LeaderboardEntry[];
  loadingLabel: string;
  navigate: (view: AppView) => void;
  startApp: () => void;
  verifyEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  createTournament: (input: TournamentInput) => Promise<void>;
  joinOpenTournament: () => void;
  joinDiscoveredTable: (table: OpenTable) => Promise<void>;
  leaveTable: (confirmMessage?: string) => Promise<void>;
  startRound: () => Promise<void>;
  hit: () => Promise<void>;
  stand: () => Promise<void>;
  resolveCurrentTurn: () => Promise<void>;
  newRound: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [view, setView] = useState<AppView>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLabel, setLoadingLabel] = useState('');

  const run = useCallback(async <T,>(label: string, action: () => Promise<T>): Promise<T> => {
    setLoadingLabel(label);

    try {
      return await action();
    } finally {
      setLoadingLabel('');
    }
  }, []);

  useEffect(() => {
    const tokenProvider = () => getToken();
    setAuthTokenProvider(tokenProvider);
    setSocketTokenProvider(tokenProvider);
  }, [getToken]);

  useEffect(() => {
    apiClient.setTableUpdateListener((update) => {
      if (update.tournament) {
        setTournament(update.tournament);
      }

      if (update.game) {
        setGame(update.game);
        if (update.game.phase === 'player-turn') {
          setView('game');
        }
      }

      if (update.leaderboard.length > 0) {
        setLeaderboard(update.leaderboard);
      }
    });

    return () => {
      apiClient.setTableUpdateListener(null);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      setAuthReady(false);
      return;
    }

    if (!isSignedIn) {
      setUser(null);
      apiClient.clearSessionUser();
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const profile = await apiClient.syncCurrentUser();
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, clerkUser?.id, clerkUser?.primaryEmailAddressId]);

  useEffect(() => {
    if (user) {
      apiClient.setSessionUser(user);
      return;
    }

    apiClient.clearSessionUser();
    setTournament(null);
    setGame(null);
    setLeaderboard([]);
  }, [user]);

  useEffect(() => {
    if (!authReady || !isSignedIn || !user) {
      return;
    }

    if (view === 'login') {
      setView(user.emailVerified ? 'dashboard' : 'verify');
    }
  }, [authReady, isSignedIn, user, view]);

  const loadLeaderboard = useCallback(async () => {
    const nextLeaderboard = await run('Refreshing leaderboard', () => apiClient.getLeaderboard());
    setLeaderboard(nextLeaderboard);
  }, [run]);

  const applyTableSession = useCallback(
    async (result: { tournament: Tournament; game: GameState | null; leaderboard: LeaderboardEntry[] }) => {
      setTournament(result.tournament);
      setLeaderboard(result.leaderboard);
      setGame(result.game);
      setView(result.game ? 'game' : 'lobby');
      if (result.game?.phase === 'round-complete') {
        await loadLeaderboard();
      }
    },
    [loadLeaderboard],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      view,
      user,
      authReady,
      tournament,
      game,
      leaderboard,
      loadingLabel,
      navigate: setView,
      startApp: () => setView('login'),
      verifyEmail: async () => {
        await clerkUser?.reload();
        const profile = await run('Checking verification status', () => apiClient.syncCurrentUser());
        setUser(profile);
      },
      signOut: async () => {
        apiClient.clearSessionUser();
        setTournament(null);
        setGame(null);
        setLeaderboard([]);
        setUser(null);
        setView('landing');
        await clerkSignOut();
      },
      createTournament: async (input: TournamentInput) => {
        const result = await run('Creating tournament', () => apiClient.createTournament(input));
        await applyTableSession(result);
      },
      joinOpenTournament: () => {
        setView('open-tables');
      },
      joinDiscoveredTable: async (table: OpenTable) => {
        const result = await run('Joining table', () => apiClient.joinDiscoveredTable(table));
        await applyTableSession(result);
      },
      leaveTable: async (confirmMessage?: string) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          return;
        }

        await run('Leaving table', () => apiClient.leaveTable());
        setTournament(null);
        setGame(null);
        setLeaderboard([]);
        setView('dashboard');
      },
      startRound: async () => {
        const nextGame = await run('Starting blackjack round', () => apiClient.startRound());
        setGame(nextGame);
        setView('game');
      },
      hit: async () => {
        const nextGame = await run('Drawing card', () => apiClient.hit());
        setGame(nextGame);

        if (nextGame.phase === 'round-complete') {
          await loadLeaderboard();
        }
      },
      stand: async () => {
        const nextGame = await run('Ending turn', () => apiClient.stand());
        setGame(nextGame);

        if (nextGame.phase === 'round-complete') {
          await loadLeaderboard();
        }
      },
      resolveCurrentTurn: async () => {
        const nextGame = await run('Refreshing turn state', () => apiClient.resolveCurrentTurn());
        if (nextGame) {
          setGame(nextGame);
        }
      },
      newRound: async () => {
        const nextGame = await run('Starting new round', () => apiClient.newRound());
        setGame(nextGame);
        setView('game');
      },
      loadLeaderboard,
    }),
    [
      applyTableSession,
      authReady,
      clerkSignOut,
      clerkUser,
      game,
      leaderboard,
      loadLeaderboard,
      loadingLabel,
      run,
      tournament,
      user,
      view,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used inside AppProvider.');
  }

  return context;
}
