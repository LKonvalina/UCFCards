import { useEffect } from 'react';
import { Button } from '../components/Button/Button';
import { LeaderboardTable } from '../components/LeaderboardTable/LeaderboardTable';
import { useApp } from '../state/AppContext';

export function LeaderboardPage() {
  const { leaderboard, loadLeaderboard, joinOpenTournament, tournament, navigate, loadingLabel } = useApp();

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <section className="page content-page">
      <div className="section-heading">
        <p className="section-eyebrow">Leaderboard</p>
        <h1>Tournament standings.</h1>
      </div>

      <LeaderboardTable entries={leaderboard} />

      <div className="page-actions">
        {tournament ? (
          <Button onClick={() => navigate('lobby')} aria-label="Return to lobby">Return to Lobby</Button>
        ) : (
          <Button onClick={joinOpenTournament} disabled={Boolean(loadingLabel)} aria-label="Join open tournament">
            Join Open Tournament
          </Button>
        )}
      </div>
    </section>
  );
}
