export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';

export type Card = {
  code: string;
  value: string;
  suit: Suit;
  image: string;
  hidden?: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  initials: string;
  emailVerified: boolean;
  imageUrl?: string;
};

export type PlayerStatus = 'Ready' | 'Waiting';

export type TournamentPlayer = {
  id: string;
  name: string;
  initials: string;
  chips: number;
  roundsWon: number;
  status: PlayerStatus;
  isCurrentUser?: boolean;
};

export type Tournament = {
  id: string;
  hostUserId: string;
  name: string;
  playerCount: number;
  startingChips: number;
  rounds: 3 | 5 | 10;
  createdAt: string;
  players: TournamentPlayer[];
};

export type TournamentInput = {
  name: string;
  playerCount: number;
  startingChips: number;
  rounds: 3 | 5 | 10;
};

export type OpenTable = {
  id: string;
  name: string;
  hostUserId: string;
  expectedPlayers: number;
  joinedCount: number;
  openSeats: number;
  startingChips: number;
  rounds: 3 | 5 | 10;
  alreadyJoined: boolean;
  players: { id: string; name: string; initials: string }[];
  createdAt: string;
};

export type GameResult = 'Win' | 'Lose' | 'Push' | 'Blackjack' | 'Bust';

export type GamePhase = 'player-turn' | 'dealer-turn' | 'round-complete';

export type TurnStatus = 'Waiting' | 'Your Turn' | 'Playing' | 'Standing' | 'Bust' | 'Complete';

export type TablePlayerRound = {
  id: string;
  name: string;
  initials: string;
  chips: number;
  hand: Card[];
  handTotal: number;
  status: TurnStatus;
  result: GameResult | null;
  isCurrentUser?: boolean;
};

export type GameState = {
  id: string;
  tournamentId: string;
  roundNumber: number;
  playerHand: Card[];
  dealerHand: Card[];
  shoe: Card[];
  phase: GamePhase;
  result: GameResult | null;
  message: string;
  chipDelta: number;
  playerChips: number;
  players: TablePlayerRound[];
  currentPlayerId: string | null;
  currentPlayerIndex: number;
  turnStartedAt: string | null;
  turnExpiresAt: string | null;
  turnDurationSeconds: number;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: string;
  player: string;
  initials: string;
  chips: number;
  roundsWon: number;
  status: string;
  isCurrentUser?: boolean;
};

export type AppView =
  | 'landing'
  | 'login'
  | 'verify'
  | 'dashboard'
  | 'create'
  | 'open-tables'
  | 'lobby'
  | 'game'
  | 'leaderboard'
  | 'learn';
