const makeCard = (code, value, suit) => ({
  code,
  value,
  suit,
  image: `https://deckofcardsapi.com/static/img/${code}.png`
});

let cardQueue = [];

export const queueDeckApiCards = (cards) => {
  cardQueue = [...cards];
};

export const createMockFetch = () => {
  return async (url) => {
    if (url.includes("/new/shuffle/")) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          deck_id: "mock-deck-id",
          shuffled: true,
          remaining: 312
        })
      };
    }

    if (url.includes("/draw/")) {
      const countMatch = url.match(/count=(\d+)/);
      const count = countMatch ? Number(countMatch[1]) : 1;
      const cards = cardQueue.splice(0, count);
      return {
        ok: true,
        json: async () => ({
          success: true,
          deck_id: "mock-deck-id",
          remaining: 312 - cardQueue.length,
          cards
        })
      };
    }

    throw new Error(`Unexpected fetch URL in test: ${url}`);
  };
};

export const defaultOpeningCards = () => [
  makeCard("9H", "9", "HEARTS"),
  makeCard("8D", "8", "DIAMONDS"),
  makeCard("7C", "7", "CLUBS"),
  makeCard("6S", "6", "SPADES"),
  makeCard("5H", "5", "HEARTS"),
  makeCard("4D", "4", "DIAMONDS")
];
