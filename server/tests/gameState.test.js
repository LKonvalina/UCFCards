import { buildGameState, mapOutcomeToGameResult } from "../src/game/gameState.js";
import { TURN_DURATION_SECONDS } from "../src/config/gameConstants.js";

describe("game state shape", () => {
  test("builds the socket game state contract", () => {
    const table = {
      status: "in_progress",
      phase: "player_turns",
      turnIndex: 0,
      turnStartedAt: new Date("2026-07-07T12:00:00.000Z"),
      turnExpiresAt: new Date("2026-07-07T12:00:15.000Z"),
      turnDurationSeconds: TURN_DURATION_SECONDS,
      message: "Round started",
      dealerHand: [{ value: "ACE", suit: "SPADES", code: "AS", image: "https://deckofcardsapi.com/static/img/AS.png" }],
      players: [
        {
          userId: "p1",
          hand: [{ value: "10", suit: "HEARTS", code: "10H", image: "https://deckofcardsapi.com/static/img/10H.png" }],
          status: "playing"
        }
      ],
      playerProfiles: [{ userId: "p1", name: "Player One", initials: "PO", chips: 1000 }],
      results: []
    };

    const state = buildGameState(table, "p1");
    expect(state.phase).toBe("player-turn");
    expect(state.currentPlayerId).toBe("p1");
    expect(state.players[0]).toMatchObject({
      id: "p1",
      name: "Player One",
      initials: "PO",
      chips: 1000,
      status: "Your Turn",
      isCurrentUser: true
    });
    expect(state.players[0].hand[0]).toMatchObject({
      code: "10H",
      value: "10",
      suit: "HEARTS"
    });
    expect(state.turnDurationSeconds).toBe(15);
    expect(state.message).toBe("Round started");
  });

  test("maps round outcomes to frontend result labels", () => {
    expect(mapOutcomeToGameResult("win")).toBe("Win");
    expect(mapOutcomeToGameResult("lose")).toBe("Lose");
    expect(mapOutcomeToGameResult("push")).toBe("Push");
    expect(mapOutcomeToGameResult(null, "busted")).toBe("Bust");
  });
});
