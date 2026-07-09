import { calculateHandValue, isBust } from '../../utils/blackjack';
import type { Card, GameResult } from '../../types';

function dealerUpcardValue(dealerHand: Card[]) {
  const upcard = dealerHand.find((card) => !card.hidden);

  if (!upcard) {
    return 0;
  }

  if (upcard.value === 'ACE') {
    return 11;
  }

  if (['JACK', 'QUEEN', 'KING'].includes(upcard.value)) {
    return 10;
  }

  return Number(upcard.value);
}

export function StrategyTips({
  playerHand,
  dealerHand,
  result,
}: {
  playerHand: Card[];
  dealerHand: Card[];
  result?: GameResult | null;
}) {
  const playerTotal = calculateHandValue(playerHand, { includeHidden: true });
  const dealerValue = dealerUpcardValue(dealerHand);
  const tips: string[] = [];

  if (isBust(playerHand, { includeHidden: true }) || result === 'Bust') {
    tips.push('Going over 21 loses the hand.');
  } else {
    if (playerTotal < 12) {
      tips.push('Usually safe to hit.');
    }

    if (playerTotal >= 17) {
      tips.push('Standing is often safer.');
    }
  }

  if (dealerValue >= 2 && dealerValue <= 6) {
    tips.push('Dealer is in a weaker position.');
  }

  if (tips.length === 0) {
    tips.push('Compare your total with the dealer upcard before choosing.');
  }

  return (
    <aside className="strategy-panel" aria-label="Strategy tips">
      <div className="section-eyebrow">Strategy Tips</div>
      <ul>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}
