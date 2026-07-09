import { FormEvent, useState } from 'react';
import { Button } from '../components/Button/Button';
import { useApp } from '../state/AppContext';
import type { TournamentInput } from '../types';

export function CreateTournamentPage() {
  const { createTournament, loadingLabel, user, navigate } = useApp();
  const [form, setForm] = useState<TournamentInput>({
    name: 'Blackjack Academy Open',
    playerCount: 4,
    startingChips: 1000,
    rounds: 5,
  });

  if (!user) {
    return (
      <section className="empty-state">
        <h1>Sign in before creating a tournament.</h1>
        <Button onClick={() => navigate('login')}>Go to Login</Button>
      </section>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createTournament(form);
  };

  return (
    <section className="page content-page">
      <div className="section-heading">
        <p className="section-eyebrow">Create Tournament</p>
        <h1>Set up a learning table.</h1>
      </div>

      <form className="form-panel" onSubmit={submit}>
        <label>
          Tournament name
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Tournament name"
          />
        </label>

        <label>
          Number of players
          <input
            type="number"
            min="2"
            max="5"
            value={form.playerCount}
            onChange={(event) => setForm((current) => ({ ...current, playerCount: Number(event.target.value) }))}
          />
        </label>

        <label>
          Starting chips
          <input
            type="number"
            min="100"
            step="100"
            value={form.startingChips}
            onChange={(event) => setForm((current) => ({ ...current, startingChips: Number(event.target.value) }))}
          />
        </label>

        <label>
          Rounds
          <select
            value={form.rounds}
            onChange={(event) => setForm((current) => ({ ...current, rounds: Number(event.target.value) as 3 | 5 | 10 }))}
          >
            <option value={3}>3 rounds</option>
            <option value={5}>5 rounds</option>
            <option value={10}>10 rounds</option>
          </select>
        </label>

        <Button type="submit" size="lg" disabled={Boolean(loadingLabel)} aria-label="Create tournament">
          Create Tournament
        </Button>
      </form>
    </section>
  );
}
