import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/apiClient';
import { Button } from '../components/Button/Button';
import { StatCard } from '../components/StatCard/StatCard';
import { useApp } from '../state/AppContext';
import type { OpenTable } from '../types';

export function OpenTablesPage() {
  const { user, navigate, joinDiscoveredTable, loadingLabel } = useApp();
  const [tables, setTables] = useState<OpenTable[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTables = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextTables = await apiClient.listOpenTables();
      setTables(nextTables);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load open tables.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.emailVerified) {
      void loadTables();
    }
  }, [loadTables, user?.emailVerified]);

  if (!user) {
    return (
      <section className="empty-state">
        <h1>Sign in to browse open tables.</h1>
        <Button onClick={() => navigate('login')}>Go to Login</Button>
      </section>
    );
  }

  if (!user.emailVerified) {
    return (
      <section className="empty-state">
        <h1>Verify your email to join open tables.</h1>
        <Button onClick={() => navigate('verify')}>Verify Email</Button>
      </section>
    );
  }

  return (
    <section className="page content-page">
      <div className="section-heading">
        <p className="section-eyebrow">Open Tables</p>
        <h1>Join a table waiting for players</h1>
        <p>Browse tournaments with open seats and jump in when you are ready.</p>
      </div>

      <div className="page-actions page-actions--inline">
        <Button variant="secondary" onClick={loadTables} disabled={refreshing || Boolean(loadingLabel)} aria-label="Refresh open tables">
          {refreshing ? 'Refreshing...' : 'Refresh List'}
        </Button>
        <Button variant="secondary" onClick={() => navigate('create')} aria-label="Create tournament">
          Create Your Own
        </Button>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {tables.length === 0 && !refreshing ? (
        <section className="empty-state empty-state--compact">
          <h2>No open tables right now</h2>
          <p>Create a tournament and others can join from this list.</p>
          <Button onClick={() => navigate('create')}>Create Tournament</Button>
        </section>
      ) : (
        <section className="open-tables-list" aria-label="Open tournament tables">
          {tables.map((table) => (
            <article className="open-table-card" key={table.id}>
              <div className="open-table-card__header">
                <div>
                  <h2>{table.name}</h2>
                  <p>
                    {table.joinedCount}/{table.expectedPlayers} players seated
                    {table.openSeats > 0 ? ` · ${table.openSeats} seat${table.openSeats === 1 ? '' : 's'} open` : ''}
                  </p>
                </div>
                <Button
                  onClick={() => joinDiscoveredTable(table)}
                  disabled={Boolean(loadingLabel)}
                  aria-label={table.alreadyJoined ? `Rejoin ${table.name}` : `Join ${table.name}`}
                >
                  {table.alreadyJoined ? 'Rejoin Table' : 'Join Table'}
                </Button>
              </div>

              <div className="stat-grid stat-grid--three">
                <StatCard label="Starting Chips" value={table.startingChips.toLocaleString()} detail="Play-money score" />
                <StatCard label="Rounds" value={table.rounds} detail="Session length" />
                <StatCard label="Created" value={new Date(table.createdAt).toLocaleTimeString()} detail={new Date(table.createdAt).toLocaleDateString()} />
              </div>

              <section className="lobby-list" aria-label={`Players at ${table.name}`}>
                {table.players.map((player) => (
                  <article className="lobby-player" key={player.id}>
                    <span className="avatar">{player.initials}</span>
                    <div>
                      <h3>{player.name}</h3>
                      <p>{player.id === table.hostUserId ? 'Host' : 'Player'}</p>
                    </div>
                  </article>
                ))}
              </section>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}
