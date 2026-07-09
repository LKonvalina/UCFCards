import { Button } from '../components/Button/Button';
import { StatCard } from '../components/StatCard/StatCard';
import { useApp } from '../state/AppContext';

export function LobbyPage() {
  const { tournament, startRound, joinOpenTournament, loadingLabel, leaveTable } = useApp();

  if (!tournament) {
    return (
      <section className="empty-state">
        <h1>No tournament lobby yet.</h1>
        <Button onClick={joinOpenTournament}>Browse Open Tables</Button>
      </section>
    );
  }

  return (
    <section className="page content-page">
      <div className="section-heading">
        <p className="section-eyebrow">Tournament Lobby</p>
        <h1>{tournament.name}</h1>
      </div>

      <div className="stat-grid stat-grid--three">
        <StatCard label="Players" value={`${tournament.players.length}/${tournament.playerCount}`} detail="Human tournament seats" />
        <StatCard label="Starting Chips" value={tournament.startingChips.toLocaleString()} detail="Play-money score" />
        <StatCard label="Rounds" value={tournament.rounds} detail="Learning session length" />
      </div>

      <section className="lobby-list" aria-label="Player list">
        {tournament.players.map((player) => (
          <article className="lobby-player" key={player.id}>
            <span className="avatar">{player.initials}</span>
            <div>
              <h2>{player.name}</h2>
              <p>{player.chips.toLocaleString()} chips</p>
            </div>
            <span className="status-pill">{player.status}</span>
          </article>
        ))}
      </section>

      <div className="page-actions">
        <Button size="lg" onClick={startRound} disabled={Boolean(loadingLabel)} aria-label="Start blackjack round">
          Start Round
        </Button>
        <Button
          variant="secondary"
          onClick={() => leaveTable('Leave this tournament lobby and return to the dashboard?')}
          disabled={Boolean(loadingLabel)}
          aria-label="Leave table"
        >
          Leave Table
        </Button>
      </div>
    </section>
  );
}
