import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createCard } from '../../api/deck';
import { StrategyTips } from './StrategyTips';

describe('StrategyTips', () => {
  it('displays relevant tips for a strong player hand and weak dealer upcard', () => {
    render(
      <StrategyTips
        playerHand={[createCard('0', 'SPADES'), createCard('8', 'HEARTS')]}
        dealerHand={[createCard('6', 'CLUBS'), { ...createCard('K', 'DIAMONDS'), hidden: true }]}
      />,
    );

    expect(screen.getByText('Standing is often safer.')).toBeInTheDocument();
    expect(screen.getByText('Dealer is in a weaker position.')).toBeInTheDocument();
  });
});
