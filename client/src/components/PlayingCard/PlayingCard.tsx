import { useState } from 'react';
import { CARD_BACK_IMAGE } from '../../api/deck';
import type { Card } from '../../types';

const suitSymbols = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
};

function rankLabel(value: string) {
  const labels: Record<string, string> = {
    ACE: 'A',
    JACK: 'J',
    QUEEN: 'Q',
    KING: 'K',
  };

  return labels[value] ?? value;
}

export function PlayingCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isHidden = Boolean(card.hidden);
  const image = isHidden ? CARD_BACK_IMAGE : card.image;
  const label = isHidden ? 'Hidden dealer card' : `${card.value} of ${card.suit.toLowerCase()}`;
  const redSuit = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';

  return (
    <article
      className={`playing-card ${compact ? 'playing-card--compact' : ''} ${redSuit ? 'playing-card--red' : ''} ${
        isHidden ? 'playing-card--hidden' : ''
      }`}
      aria-label={label}
    >
      {!imageFailed ? (
        <img src={image} alt={label} loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <div className="playing-card__fallback">
          <span>{isHidden ? 'CARD' : rankLabel(card.value)}</span>
          <strong>{isHidden ? 'BACK' : suitSymbols[card.suit]}</strong>
          <span>{isHidden ? 'HIDDEN' : rankLabel(card.value)}</span>
        </div>
      )}
    </article>
  );
}
