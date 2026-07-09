import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CARD_BACK_IMAGE, createCard } from '../../api/deck';
import { PlayingCard } from './PlayingCard';

describe('PlayingCard', () => {
  it('renders the hidden card back when hidden is true', () => {
    render(<PlayingCard card={{ ...createCard('A', 'HEARTS'), hidden: true }} />);

    const image = screen.getByAltText('Hidden dealer card');
    expect(image).toHaveAttribute('src', CARD_BACK_IMAGE);
  });
});
