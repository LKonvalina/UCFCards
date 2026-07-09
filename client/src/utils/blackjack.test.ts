import { describe, expect, it } from 'vitest';
import { createCard } from '../api/deck';
import { calculateHandValue, compareHands, isBust } from './blackjack';

describe('blackjack scoring', () => {
  it('calculates number cards and face cards', () => {
    const hand = [createCard('9', 'SPADES'), createCard('K', 'HEARTS')];

    expect(calculateHandValue(hand, { includeHidden: true })).toBe(19);
  });

  it('handles aces as 11 or 1', () => {
    const softHand = [createCard('A', 'HEARTS'), createCard('6', 'CLUBS')];
    const adjustedHand = [createCard('A', 'HEARTS'), createCard('9', 'CLUBS'), createCard('8', 'DIAMONDS')];

    expect(calculateHandValue(softHand, { includeHidden: true })).toBe(17);
    expect(calculateHandValue(adjustedHand, { includeHidden: true })).toBe(18);
  });

  it('detects busts', () => {
    const hand = [createCard('K', 'SPADES'), createCard('9', 'HEARTS'), createCard('5', 'DIAMONDS')];

    expect(isBust(hand, { includeHidden: true })).toBe(true);
  });

  it('calculates winner outcomes', () => {
    const playerWin = [createCard('0', 'SPADES'), createCard('9', 'HEARTS')];
    const dealerLose = [createCard('8', 'CLUBS'), createCard('Q', 'DIAMONDS')];
    const playerPush = [createCard('K', 'SPADES'), createCard('8', 'HEARTS')];
    const dealerPush = [createCard('J', 'CLUBS'), createCard('8', 'DIAMONDS')];
    const playerBlackjack = [createCard('A', 'SPADES'), createCard('K', 'HEARTS')];

    expect(compareHands(playerWin, dealerLose)).toBe('Win');
    expect(compareHands(playerPush, dealerPush)).toBe('Push');
    expect(compareHands(playerBlackjack, dealerLose)).toBe('Blackjack');
  });
});
