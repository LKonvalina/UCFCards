import type { Card, GameResult } from '../types';

type HandValueOptions = {
  includeHidden?: boolean;
};

const faceValues = new Set(['JACK', 'QUEEN', 'KING']);

export function getCardPoints(card: Card): number {
  if (card.value === 'ACE') {
    return 11;
  }

  if (faceValues.has(card.value)) {
    return 10;
  }

  return Number(card.value);
}

export function calculateHandValue(cards: Card[], options: HandValueOptions = {}): number {
  const visibleCards = options.includeHidden
    ? cards
    : cards.filter((card) => !card.hidden);

  let total = 0;
  let aces = 0;

  visibleCards.forEach((card) => {
    if (card.value === 'ACE') {
      aces += 1;
    }

    total += getCardPoints(card);
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

export function isBust(cards: Card[], options?: HandValueOptions): boolean {
  return calculateHandValue(cards, options) > 21;
}

export function isBlackjack(cards: Card[], options?: HandValueOptions): boolean {
  return cards.filter((card) => options?.includeHidden || !card.hidden).length === 2
    && calculateHandValue(cards, options) === 21;
}

export function shouldDealerDraw(cards: Card[]): boolean {
  return calculateHandValue(cards, { includeHidden: true }) < 17;
}

export function compareHands(playerHand: Card[], dealerHand: Card[]): GameResult {
  const playerTotal = calculateHandValue(playerHand, { includeHidden: true });
  const dealerTotal = calculateHandValue(dealerHand, { includeHidden: true });

  if (playerTotal > 21) {
    return 'Bust';
  }

  if (isBlackjack(playerHand, { includeHidden: true }) && !isBlackjack(dealerHand, { includeHidden: true })) {
    return 'Blackjack';
  }

  if (dealerTotal > 21) {
    return 'Win';
  }

  if (playerTotal > dealerTotal) {
    return 'Win';
  }

  if (playerTotal < dealerTotal) {
    return 'Lose';
  }

  return 'Push';
}

export function resultMessage(result: GameResult): string {
  const messages: Record<GameResult, string> = {
    Blackjack: 'Blackjack. Great opening hand.',
    Win: 'You finished closer to 21 than the dealer.',
    Lose: 'The dealer finished closer to 21.',
    Push: 'Same total as the dealer. The round is a push.',
    Bust: 'You went over 21. Use the total as a learning signal for next round.',
  };

  return messages[result];
}

export function chipDeltaForResult(result: GameResult): number {
  const changes: Record<GameResult, number> = {
    Blackjack: 150,
    Win: 100,
    Push: 0,
    Lose: -100,
    Bust: -100,
  };

  return changes[result];
}
