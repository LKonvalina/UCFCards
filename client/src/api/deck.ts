import type { Card, Suit } from '../types';

export const CARD_BACK_IMAGE = 'https://deckofcardsapi.com/static/img/back.png';

const suitCode: Record<Suit, string> = {
  HEARTS: 'H',
  DIAMONDS: 'D',
  CLUBS: 'C',
  SPADES: 'S',
};

const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K'];

const valueLabel: Record<string, string> = {
  A: 'ACE',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '0': '10',
  J: 'JACK',
  Q: 'QUEEN',
  K: 'KING',
};

const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

export function createCard(value: string, suit: Suit): Card {
  const code = `${value}${suitCode[suit]}`;

  return {
    code,
    value: valueLabel[value] ?? value,
    suit,
    image: `https://deckofcardsapi.com/static/img/${code}.png`,
  };
}

export function createFullDeck(): Card[] {
  return suits.flatMap((suit) => values.map((value) => createCard(value, suit)));
}

function cardByCode(code: string): Card {
  const deck = createFullDeck();
  const card = deck.find((candidate) => candidate.code === code);

  if (!card) {
    throw new Error(`Unknown card code: ${code}`);
  }

  return card;
}

const roundScripts = [
  ['AH', '6C', '9S', 'KD', '5H', '3S', '8D', '2C', 'JC', '4H'],
  ['8H', '5C', '5S', '9D', '7H', '4S', 'QS', '2D', '3C', 'KH'],
  ['0S', '4D', 'AC', '7C', '9H', '6S', '2H', 'JD', '5D', '8C'],
];

export function createShoe(roundNumber = 1): Card[] {
  const script = roundScripts[(roundNumber - 1) % roundScripts.length].map(cardByCode);
  const scriptedCodes = new Set(script.map((card) => card.code));
  const restOfDeck = createFullDeck().filter((card) => !scriptedCodes.has(card.code));

  return [...script, ...restOfDeck];
}

export function drawFromShoe(shoe: Card[]): Card {
  const card = shoe.shift();

  if (!card) {
    throw new Error('The card shoe is empty.');
  }

  return { ...card };
}
