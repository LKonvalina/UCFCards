import { createShuffledDeck, drawCards } from "../services/deckOfCards.js";

const cardValue = (value) => {
  if (["KING", "QUEEN", "JACK"].includes(value)) return 10;
  if (value === "ACE") return 11;
  if (value === "10") return 10;
  return Number(value);
};

export const calculateHandValue = (hand) => {
  let total = hand.reduce((sum, card) => sum + cardValue(card.value), 0);
  let aces = hand.filter((card) => card.value === "ACE").length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
};

export const initializeRound = async (playerIds) => {
  const { deckId, remaining } = await createShuffledDeck(1);
  const drawCount = playerIds.length * 2 + 2;
  const initialDraw = await drawCards(deckId, drawCount);

  let cardIndex = 0;
  const players = playerIds.map((id) => ({
    userId: id,
    hand: [initialDraw.cards[cardIndex++], initialDraw.cards[cardIndex++]],
    status: "playing"
  }));
  const dealerHand = [initialDraw.cards[cardIndex++], initialDraw.cards[cardIndex++]];

  return {
    deckId: initialDraw.deckId,
    deckRemaining: initialDraw.remaining,
    players,
    dealerHand,
    turnIndex: 0,
    phase: "player_turns",
    results: []
  };
};

export const advanceTurn = (round) => {
  let idx = round.turnIndex + 1;
  while (idx < round.players.length && round.players[idx].status !== "playing") {
    idx += 1;
  }

  if (idx >= round.players.length) {
    return { ...round, phase: "dealer_turn", turnIndex: round.players.length };
  }

  return { ...round, turnIndex: idx };
};

export const drawCard = async (round) => {
  const draw = await drawCards(round.deckId, 1);
  return {
    card: draw.cards[0],
    deckId: draw.deckId,
    deckRemaining: draw.remaining
  };
};

export const resolveDealer = async (round) => {
  const dealerHand = [...round.dealerHand];
  let deckId = round.deckId;
  let deckRemaining = round.deckRemaining;

  while (calculateHandValue(dealerHand) < 17) {
    const draw = await drawCards(deckId, 1);
    dealerHand.push(draw.cards[0]);
    deckId = draw.deckId;
    deckRemaining = draw.remaining;
  }

  const dealerScore = calculateHandValue(dealerHand);
  const results = round.players.map((player) => {
    const playerScore = calculateHandValue(player.hand);
    if (player.status === "busted" || playerScore > 21) return { userId: player.userId, outcome: "lose" };
    if (dealerScore > 21) return { userId: player.userId, outcome: "win" };
    if (playerScore > dealerScore) return { userId: player.userId, outcome: "win" };
    if (playerScore === dealerScore) return { userId: player.userId, outcome: "push" };
    return { userId: player.userId, outcome: "lose" };
  });

  return {
    ...round,
    dealerHand,
    deckId,
    deckRemaining,
    phase: "finished",
    results
  };
};
