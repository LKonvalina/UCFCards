import type { Card } from '../../types';
import { PlayingCard } from '../PlayingCard/PlayingCard';

type CardHandProps = {
  cards: Card[];
  label: string;
  total: number;
  totalLabel?: string;
  compact?: boolean;
};

export function CardHand({ cards, label, total, totalLabel = 'Total', compact = false }: CardHandProps) {
  return (
    <section className="card-hand" aria-label={label}>
      <div className="card-hand__header">
        <h3>{label}</h3>
        <span>{totalLabel}: {total}</span>
      </div>
      <div className="card-hand__cards">
        {cards.map((card, index) => (
          <PlayingCard card={card} compact={compact} key={`${card.code}-${index}-${card.hidden ? 'hidden' : 'shown'}`} />
        ))}
      </div>
    </section>
  );
}
