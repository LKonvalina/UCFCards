import { Button } from '../components/Button/Button';
import { StatCard } from '../components/StatCard/StatCard';
import { useApp } from '../state/AppContext';

export function DashboardPage() {
  const { user, navigate, joinOpenTournament, tournament } = useApp();

  if (!user) {
    return (
      <section className="empty-state">
        <h1>Sign in to open the dashboard.</h1>
        <Button onClick={() => navigate('login')}>Go to Login</Button>
      </section>
    );
  }

  return (
    <section className="page content-page">
      <div className="section-heading">
        <p className="section-eyebrow">Dashboard</p>
        <h1>Ready for a learning tournament, {user.name.split(' ')[0]}?</h1>
      </div>

      <div className="dashboard-grid">
        <article className="profile-panel">
          <span className="avatar avatar--large">{user.initials}</span>
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <span className="status-pill">{user.emailVerified ? 'Email verified' : 'Verification required'}</span>
          </div>
        </article>

        <div className="stat-grid">
          <StatCard label="Active Tournament" value={tournament ? tournament.name : 'None'} detail="Create or join a table" />
          <StatCard label="Current Chips" value={tournament?.players.find((player) => player.isCurrentUser)?.chips ?? 1000} detail="Play-money learning score" />
          <StatCard label="Practice Mode" value="Ready" detail="Create a table or join an open one" />
        </div>
      </div>

      <section className="content-band content-band--compact">
        <div className="section-heading">
          <p className="section-eyebrow">Quick Actions</p>
          <h2>Jump into your next learning session.</h2>
        </div>
        <div className="action-grid">
          <Button onClick={() => navigate('create')} aria-label="Create tournament">Create Tournament</Button>
          <Button variant="secondary" onClick={joinOpenTournament} aria-label="Join open tournament">
            Browse Open Tables
          </Button>
          <Button variant="secondary" onClick={() => navigate('leaderboard')} aria-label="View leaderboard">View Leaderboard</Button>
          <Button variant="secondary" onClick={() => navigate('learn')} aria-label="Learn blackjack rules">Learn Blackjack Rules</Button>
        </div>
      </section>
    </section>
  );
}
