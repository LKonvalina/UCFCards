import { FormEvent, useState } from 'react';
import { Button } from '../components/Button/Button';
import { useApp } from '../state/AppContext';
import type { BotDifficulty, TournamentInput } from '../types';

export function CreateTournamentPage() {
  const { createTournament, loadingLabel, user, navigate } = useApp();
  const [form, setForm] = useState<TournamentInput>({
    name: 'Blackjack Academy Open',
    playerCount: 4,
    startingChips: 1000,
    rounds: 5,
    bots: [],
  });
  const [nextBotDifficulty, setNextBotDifficulty] = useState<BotDifficulty>('medium');

  //host always takes one seat so bots can fill every other seat
  const maxBots = Math.max(0, form.playerCount - 1);

  const addBot = () => {
    setForm((current) =>
      current.bots.length >= maxBots
        ? current
        : { ...current, bots: [...current.bots, nextBotDifficulty] },
    );
  };

  const removeBot = (index: number) => {
    setForm((current) => ({
      ...current,
      bots: current.bots.filter((_, position) => position !== index),
    }));
  };

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
            onChange={(event) =>
              setForm((current) => {
                const playerCount = Number(event.target.value);
                const seatsForBots = Math.max(0, playerCount - 1);
                return { ...current, playerCount, bots: current.bots.slice(0, seatsForBots) };
              })
            }
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

        <div className="bot-setup">
          <p className="section-eyebrow">Fill seats with bots</p>
          <p>
            You take one seat. You can add up to {maxBots} bot{maxBots === 1 ? '' : 's'} to fill the rest.
          </p>

          <div className="bot-add-row">
            <select
              value={nextBotDifficulty}
              onChange={(event) => setNextBotDifficulty(event.target.value as BotDifficulty)}
              aria-label="Bot difficulty"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <Button type="button" onClick={addBot} disabled={form.bots.length >= maxBots}>
              Add bot
            </Button>
          </div>

          {form.bots.length > 0 && (
            <ul className="bot-list">
              {form.bots.map((difficulty, index) => (
                <li key={index}>
                  <span>
                    Bot {index + 1} — {difficulty}
                  </span>
                  <button type="button" onClick={() => removeBot(index)} aria-label={`Remove bot ${index + 1}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" size="lg" disabled={Boolean(loadingLabel)} aria-label="Create tournament">
          Create Tournament
        </Button>
      </form>
    </section>
  );
}
