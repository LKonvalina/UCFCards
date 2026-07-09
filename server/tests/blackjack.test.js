import { calculateHandValue } from "../src/game/blackjack.js";
import { mapApiCard } from "../src/services/deckOfCards.js";

describe("deck of cards mapping", () => {
  test("maps API card payload to frontend contract", () => {
    const card = mapApiCard({
      code: "6H",
      value: "6",
      suit: "HEARTS",
      image: "https://deckofcardsapi.com/static/img/6H.png"
    });
    expect(card).toEqual({
      code: "6H",
      value: "6",
      suit: "HEARTS",
      image: "https://deckofcardsapi.com/static/img/6H.png"
    });
  });
});

describe("blackjack scoring", () => {
  test("handles ace as 1 when busting", () => {
    const hand = [
      { value: "ACE", suit: "SPADES", code: "AS", image: "" },
      { value: "9", suit: "HEARTS", code: "9H", image: "" },
      { value: "5", suit: "DIAMONDS", code: "5D", image: "" }
    ];
    expect(calculateHandValue(hand)).toBe(15);
  });
});
