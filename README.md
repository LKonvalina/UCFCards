# Blackjack Academy Tournament

Blackjack Academy Tournament is a React frontend for a play-money blackjack learning platform. Players can sign in, verify their email status, create or join a tournament table, play timed turns against the dealer, review strategy tips, and track standings on a leaderboard.

## Frontend Implementation

- React + Vite + TypeScript client.
- API-ready data layer in `src/api/apiClient.ts`.
- Card and deck helpers in `src/api/deck.ts`.
- Frontend state for the active user, tournament, game table, and leaderboard.
- Sign-in and email verification UI wired through replaceable API functions.
- Turn-based table UI with all seats visible, active seat tracking, and 15-second player action windows.
- Deck of Cards image URLs for card faces and hidden dealer card rendering.
- Reusable `PlayingCard` and `CardHand` components.
- Blackjack scoring utilities with ace handling, bust detection, and winner calculation.
- Strategy tips while playing.
- Responsive UI aimed at strong Lighthouse scores.

## Backend Integration

The frontend runs locally through an API adapter so the interface can be developed and tested while server endpoints are connected. The backend team can replace the internals of `src/api/apiClient.ts` with real `fetch('/api/...')` calls while keeping the page and component structure intact.

Expected backend areas:

- User authentication
- Email verification status
- Tournament creation, join, and lookup
- Round start, hit, stand, timeout, and new-round actions
- Leaderboard data
- Deck service integration

## Turn-Based Multiplayer Contract

The game table is designed around server-owned turn order. When the backend is connected, Socket.IO should broadcast game updates whenever a player joins, a round starts, a player acts, a timer expires, the dealer plays, or the round completes.

The frontend already expects this shape:

- `players`: ordered seats for the round
- each player seat includes hand cards, hand total, chips, result, and status
- `currentPlayerId`: whose turn is active
- `currentPlayerIndex`: active seat position
- `turnStartedAt`: timestamp for the current action window
- `turnExpiresAt`: timestamp for the 15-second deadline
- `turnDurationSeconds`: default action window length
- per-player `status`: `Waiting`, `Your Turn`, `Playing`, `Standing`, `Bust`, or `Complete`

The backend should enforce the timer and automatically resolve an expired turn, usually by standing for that player. The frontend displays the countdown and disables `Hit` / `Stand` unless the active seat belongs to the signed-in user.

Backend endpoint tests with Jest + Supertest should be added once the Express routes are implemented.

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run ci
```

This runs:

- **Server:** Jest + Supertest API and unit tests (`server/tests/`)
- **Client:** Vitest component and utility tests
- **Client:** Production TypeScript build

## CI/CD

### Test pipeline (`.github/workflows/ci.yml`)

Runs on every **push** and **pull request** to `main`/`master`:

- `server-tests` — Jest + Supertest with coverage (`npm run test:ci` in `server/`)
- `client-tests` — Vitest unit tests and production build

If any job fails, the workflow reports a breaking change and blocks the PR merge until fixed.

### Deploy pipeline (`.github/workflows/deploy.yml`)

Runs after every **push** to `main`/`master`, or manually via **Actions → Deploy to GCP Compute Engine**.

Deploy steps:

1. Re-run server and client tests
2. Build the React app with production Clerk/API URLs
3. Package the MERN release and upload to GCP Compute Engine
4. Configure Nginx + systemd on the VM and restart services
5. Verify `GET /api/health` both on the VM and through the public URL

See [deploy/README.md](deploy/README.md) for GCP VM bootstrap, GitHub secrets, and the `production` environment approval gate.

Local commands:

```bash
npm run test:server   # Jest + Supertest only
npm run test:client   # Vitest only
npm run test:all      # Both test suites
npm run ci            # Full CI pipeline
```
