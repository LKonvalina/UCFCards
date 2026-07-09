import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button/Button';
import { CardHand } from '../components/CardHand/CardHand';
import { PlayingCard } from '../components/PlayingCard/PlayingCard';
import { StrategyTips } from '../components/StrategyTips/StrategyTips';
import { useApp } from '../state/AppContext';
import type { TablePlayerRound } from '../types';
import { calculateHandValue } from '../utils/blackjack';

function deltaLabel(delta: number) {
  if (delta > 0) {
    return `+${delta}`;
  }

  return String(delta);
}

function statusClass(status: TablePlayerRound['status']) {
  return status.toLowerCase().replace(/\s+/g, '-');
}

function getSecondsLeft(expiresAt: string | null, now: number) {
  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}

export function GameTablePage() {
  const { game, tournament, hit, stand, newRound, navigate, loadingLabel, leaveTable } = useApp();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!game || game.phase !== 'player-turn') {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 250);

    return () => window.clearInterval(timer);
  }, [game]);

  const currentPlayer = useMemo(
    () => game?.players.find((player) => player.id === game.currentPlayerId) ?? null,
    [game],
  );
  const currentUserSeat = useMemo(() => game?.players.find((player) => player.isCurrentUser) ?? null, [game]);
  const secondsLeft = getSecondsLeft(game?.turnExpiresAt ?? null, now);
  const isRoundComplete = game?.phase === 'round-complete';
  const isCurrentUsersTurn = game?.phase === 'player-turn' && Boolean(currentPlayer?.isCurrentUser);
  const isLoading = Boolean(loadingLabel);

  if (!game) {
    return (
      <section className="empty-state">
        <h1>Start a round from the lobby.</h1>
        <Button onClick={() => navigate(tournament ? 'lobby' : 'create')}>{tournament ? 'Back to Lobby' : 'Create Tournament'}</Button>
      </section>
    );
  }

  const currentUserHand = currentUserSeat?.hand ?? game.playerHand;
  const playerTotal = calculateHandValue(currentUserHand, { includeHidden: true });
  const dealerTotal = calculateHandValue(game.dealerHand, { includeHidden: game.phase !== 'player-turn' });
  const turnProgress = game.turnDurationSeconds
    ? ((game.turnDurationSeconds - secondsLeft) / game.turnDurationSeconds) * 100
    : 100;
  const turnName = currentPlayer?.isCurrentUser ? 'Your turn' : currentPlayer?.name ?? 'Dealer';
  const canAct = isCurrentUsersTurn && !isLoading && !isRoundComplete;

  return (
    <section className="game-page">
      <div className="game-header">
        <div>
          <p className="section-eyebrow">Round {game.roundNumber}</p>
          <h1>{tournament?.name ?? 'Blackjack Table'}</h1>
        </div>
        <div className="game-header__actions">
          <div className="chip-summary">
            <span>Chips</span>
            <strong>{game.playerChips.toLocaleString()}</strong>
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              leaveTable(
                game.phase === 'round-complete'
                  ? 'Leave this table and return to the dashboard?'
                  : 'Leave this table? Your seat in the current round will be given up.',
              )
            }
            disabled={isLoading}
            aria-label="Leave table"
          >
            Leave Table
          </Button>
        </div>
      </div>

      <div className="table-layout">
        <aside className="turn-panel" aria-label="Turn order">
          <div className="turn-panel__header">
            <p className="section-eyebrow">Turn Order</p>
            <strong>15 second turns</strong>
          </div>
          <ol className="turn-list">
            {game.players.map((player, index) => (
              <li
                className={`turn-player ${player.id === game.currentPlayerId ? 'turn-player--active' : ''} ${
                  player.isCurrentUser ? 'turn-player--you' : ''
                }`}
                key={player.id}
              >
                <span className="turn-seat">{index + 1}</span>
                <span className="avatar avatar--small">{player.initials}</span>
                <span className="turn-player__copy">
                  <strong>{player.isCurrentUser ? 'You' : player.name}</strong>
                  <small>{player.chips.toLocaleString()} chips</small>
                </span>
                <span className={`turn-status turn-status--${statusClass(player.status)}`}>{player.status}</span>
                <span className="turn-total">Total {player.handTotal}</span>
              </li>
            ))}
          </ol>
        </aside>

        <div className="blackjack-table">
          <div className="turn-banner" aria-live="polite">
            <div>
              <span>Current turn</span>
              <strong>{turnName}</strong>
              <small>{game.phase === 'player-turn' ? game.message : 'Round complete'}</small>
            </div>
            <div className={`turn-clock ${secondsLeft <= 5 && game.phase === 'player-turn' ? 'turn-clock--urgent' : ''}`}>
              <span>{game.phase === 'player-turn' ? secondsLeft : 0}</span>
              <small>seconds</small>
            </div>
            <div className="turn-meter" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(0, turnProgress))}%` }} />
            </div>
          </div>

          <CardHand
            cards={game.dealerHand}
            label="Dealer"
            total={dealerTotal}
            totalLabel={isRoundComplete ? 'Total' : 'Visible total'}
          />

          <section className="table-seat-grid" aria-label="Players at table">
            {game.players.map((player) => (
              <article
                className={`table-seat ${player.id === game.currentPlayerId ? 'table-seat--active' : ''} ${
                  player.isCurrentUser ? 'table-seat--you' : ''
                }`}
                key={player.id}
              >
                <div className="table-seat__header">
                  <span className="avatar avatar--small">{player.initials}</span>
                  <div>
                    <strong>{player.isCurrentUser ? 'You' : player.name}</strong>
                    <small>{player.status}</small>
                  </div>
                  <span>Total {player.handTotal}</span>
                </div>
                <div className="table-seat__cards">
                  {player.hand.map((card, index) => (
                    <PlayingCard card={card} compact key={`${player.id}-${card.code}-${index}`} />
                  ))}
                </div>
              </article>
            ))}
          </section>

          <div className="table-center">
            {game.result ? (
              <div className={`result-banner result-banner--${game.result.toLowerCase()}`} role="status">
                <strong>{game.result}</strong>
                <span>{game.message}</span>
                <small>Chip change: {deltaLabel(game.chipDelta)}</small>
              </div>
            ) : (
              <div className="round-message" role="status">
                {isCurrentUsersTurn ? game.message : `Waiting for ${currentPlayer?.name ?? 'the next player'}.`}
              </div>
            )}
          </div>

          <CardHand cards={currentUserHand} label="Your Hand" total={playerTotal} />

          <div className="table-actions">
            <Button onClick={hit} disabled={!canAct || playerTotal >= 21} aria-label="Hit and draw a card">
              Hit
            </Button>
            <Button variant="secondary" onClick={stand} disabled={!canAct} aria-label="Stand and end your turn">
              Stand
            </Button>
            <Button variant="ghost" onClick={newRound} disabled={isLoading} aria-label="Start a new round">
              New Round
            </Button>
          </div>
        </div>

        <StrategyTips playerHand={currentUserHand} dealerHand={game.dealerHand} result={game.result} />
      </div>
    </section>
  );
}
