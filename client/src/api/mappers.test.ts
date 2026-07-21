import { describe, expect, it } from 'vitest';
import { mapLeaderboardRows, mapServerGameState } from './mappers';
import type { ServerGameState } from './mappers';

describe('api mappers', () => {
  it('maps server game state into the client game contract', () => {
    const serverState: ServerGameState = {
      roundNumber: 2,
      players: [
        {
          id: 'p1',
          name: 'Player One',
          initials: 'PO',
          chips: 1000,
          hand: [{ code: '10H', value: '10', suit: 'HEARTS', image: 'https://deckofcardsapi.com/static/img/10H.png' }],
          handTotal: 10,
          status: 'Your Turn',
          result: null,
          isCurrentUser: true,
        },
      ],
      dealerHand: [{ code: 'AS', value: 'ACE', suit: 'SPADES', image: 'https://deckofcardsapi.com/static/img/AS.png', hidden: true }],
      phase: 'player-turn',
      currentPlayerId: 'p1',
      currentPlayerIndex: 0,
      turnStartedAt: '2026-07-07T12:00:00.000Z',
      turnExpiresAt: '2026-07-07T12:00:15.000Z',
      turnDurationSeconds: 15,
      result: null,
      message: 'Your turn',
    };

    const game = mapServerGameState(serverState, 'table-1', {
      name: 'Test Table',
      startingChips: 1000,
      rounds: 5,
      createdAt: '2026-07-07T12:00:00.000Z',
      roundNumber: 1,
    }, 'p1');

    expect(game.id).toBe('table-1');
    expect(game.roundNumber).toBe(2);
    expect(game.turnDurationSeconds).toBe(15);
    expect(game.players[0].hand[0].suit).toBe('HEARTS');
    expect(game.playerHand).toHaveLength(1);
  });

  it('derives the current user and active turn from neutral socket state', () => {
    const serverState: ServerGameState = {
      roundNumber: 1,
      players: [
        {
          id: 'p1',
          name: 'Host',
          initials: 'HO',
          chips: 1000,
          hand: [],
          handTotal: 12,
          status: 'Your Turn',
          result: null,
          isCurrentUser: true,
        },
        {
          id: 'p2',
          name: 'Guest',
          initials: 'GU',
          chips: 1000,
          hand: [],
          handTotal: 18,
          status: 'Playing',
          result: null,
        },
      ],
      dealerHand: [],
      phase: 'player-turn',
      currentPlayerId: 'p2',
      currentPlayerIndex: 1,
      turnStartedAt: null,
      turnExpiresAt: null,
      turnDurationSeconds: 15,
      result: null,
      message: "p2's turn",
    };

    const game = mapServerGameState(serverState, 'table-1', {
      name: 'Test Table',
      startingChips: 1000,
      rounds: 5,
      createdAt: '2026-07-07T12:00:00.000Z',
      roundNumber: 0,
    }, 'p2');

    expect(game.players[0]).toMatchObject({ id: 'p1', isCurrentUser: false, status: 'Playing' });
    expect(game.players[1]).toMatchObject({ id: 'p2', isCurrentUser: true, status: 'Your Turn' });
  });

  it('maps leaderboard rows with ranks', () => {
    const rows = mapLeaderboardRows(
      [
        { id: 'p2', name: 'Maya', initials: 'MC', chips: 1200 },
        { id: 'p1', name: 'Alex', initials: 'AC', chips: 900 },
      ],
      'p1',
      ['p1', 'p2'],
    );

    expect(rows[0].rank).toBe(1);
    expect(rows[0].player).toBe('Maya');
    expect(rows[1].isCurrentUser).toBe(true);
  });
});
