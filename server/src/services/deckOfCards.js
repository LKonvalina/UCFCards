const API_BASE = "https://deckofcardsapi.com/api/deck";

let fetchImpl = globalThis.fetch.bind(globalThis);

export const setFetchImpl = (impl) => {
  fetchImpl = impl;
};

export const normalizeCardValue = (value) => {
  if (value === "0") return "10";
  return value;
};

export const normalizeSuit = (suit) => suit;

export const mapApiCard = (apiCard) => ({
  code: apiCard.code,
  value: normalizeCardValue(apiCard.value),
  suit: apiCard.suit,
  image: apiCard.image
});

const parseResponse = async (response) => {
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Deck of Cards API request failed.");
  }
  return data;
};

export const createShuffledDeck = async (deckCount = 1) => {
  const response = await fetchImpl(`${API_BASE}/new/shuffle/?deck_count=${deckCount}`);
  const data = await parseResponse(response);
  return {
    deckId: data.deck_id,
    remaining: data.remaining
  };
};

export const drawCards = async (deckId, count) => {
  const response = await fetchImpl(`${API_BASE}/${deckId}/draw/?count=${count}`);
  const data = await parseResponse(response);
  return {
    deckId: data.deck_id,
    remaining: data.remaining,
    cards: data.cards.map(mapApiCard)
  };
};
