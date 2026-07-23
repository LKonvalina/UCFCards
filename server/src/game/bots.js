
import { ensureSeatedPlayer } from "../services/tableStore.js";

//how long a bot thinks before it acts. read at turn time so tests can speed it up with BOT_TURN_DELAY_MS.
const botTurnDelayMs = () => Number(process.env.BOT_TURN_DELAY_MS) || 800;

export const DIFFICULTIES = ["easy", "medium", "hard"];

//names for bots
const BOT_NAMES = ["RoboGuy", "TuringTim", "ComputerCarl", "PlanktonsWife", "3xp3rtBl@ckJ@ckPl@y3r", "Tom", "Christmas", "TheFish", "TheKnower"];



//Recognising a bot

export const isBot = (userId) => typeof userId === "string" && userId.startsWith("bot-");

export const botDifficulty = (userId) => userId.split("-")[1]; // easy,medium,hard

const makeBotId = (difficulty) => {
  const randomTag = Math.random().toString(36).slice(2, 6); // 4 random characters
  return `bot-${difficulty}-${randomTag}`;
};



//Reading a hand (what is the total, and is it soft)

const cardValue = (value) => {
  if (["KING", "QUEEN", "JACK", "10"].includes(value)) return 10;
  if (value === "ACE") return 11;
  return Number(value);
};

const readHand = (hand) => {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.value);
    if (card.value === "ACE") aces += 1;
  }
  // If we are over 21, turn Aces from 11 into 1 (subtract 10) until we are safe.
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  // Any Ace still counted as 11 means the hand is "soft"
  return { total, isSoft: aces > 0 };
};

const dealerUpcardValue = (dealerHand) => cardValue(dealerHand[0].value);



// lookup table

const DEALER_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 11 = Ace

const HARD_TABLE = {
  12: ["H", "H", "S", "S", "S", "H", "H", "H", "H", "H"],
  13: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  14: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  15: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"],
  16: ["S", "S", "S", "S", "S", "H", "H", "H", "H", "H"]
};

// The one soft hand where the dealer's card changes the answer (Ace + 7 = 18)
const SOFT_18 = ["S", "S", "S", "S", "S", "S", "S", "H", "H", "H"];

// Given a hand total and the dealer's upcard, return the textbook best move.
export const basicStrategy = (total, isSoft, dealerUpcard) => {
  const column = DEALER_ORDER.indexOf(dealerUpcard);

  if (total <= 11) return "hit"; 
  if (isSoft && total <= 17) return "hit"; 
  if (isSoft && total === 18) return SOFT_18[column] === "H" ? "hit" : "stand";
  if (isSoft) return "stand"; 
  if (total >= 17) return "stand"; 
  return HARD_TABLE[total][column] === "H" ? "hit" : "stand"; 
};

//Difficulty

export const decideBotAction = (total, isSoft, dealerUpcard, difficulty) => {
  //EASY: a beginner who just copies the dealer's rule and ignores the chart.
  if (difficulty === "easy") {
    return total < 17 ? "hit" : "stand";
  }

  //MEDIUM: follows the chart but slips up 15% of the time
  if (difficulty === "medium") {
    const best = basicStrategy(total, isSoft, dealerUpcard);
    const makesMistake = Math.random() < 0.15;
    if (!makesMistake) return best;
    return best === "hit" ? "stand" : "hit";
  }

  //HARD: plays the chart perfectly
  return basicStrategy(total, isSoft, dealerUpcard);
};

//Seating bots. called by the host when they set up the table.
//Adds bot players into the empty seats, giving each a name and starting chips
//through ensureSeatedPlayer — the exact same helper humans go through 

export const seatBots = async (table, requestedDifficulties = []) => {
  const openSeats = table.expectedPlayers - table.joinedPlayers.length;
  const difficulties = requestedDifficulties
    .filter((difficulty) => DIFFICULTIES.includes(difficulty))
    .slice(0, Math.max(0, openSeats));

  if (difficulties.length === 0) return table.joinedPlayers;

  for (let index = 0; index < difficulties.length; index += 1) {
    const botId = makeBotId(difficulties[index]);
    const name = BOT_NAMES[index % BOT_NAMES.length];
    table.joinedPlayers.push(botId);
    await ensureSeatedPlayer(table, botId, name);
  }

  await table.save();
  return table.joinedPlayers;
};


//Playing a bot's turn.
//The game calls this when the current player is a bot. We look at the bot's hand and the dealer's upcard, decide, pause briefly, then play the SAME
//hit/stand action a human clicks (handed in as `actions`). If the bot hits
//without busting, the game calls this again for the next card so a bot naturally keeps going until it stands or busts.


export const runBotTurn = (io, ctx, actions) => {
  const view = ctx.view;
  const tableId = ctx.table._id.toString();
  const bot = view.players[view.turnIndex];
  if (!bot || !isBot(bot.userId)) return;

  const { total, isSoft } = readHand(bot.hand);
  const dealerUpcard = dealerUpcardValue(view.dealerHand);
  const action = decideBotAction(total, isSoft, dealerUpcard, botDifficulty(bot.userId));

  setTimeout(async () => {
    try {
      if (action === "hit") {
        await actions.playerHit(io, tableId, bot.userId);
      } else {
        await actions.playerStand(io, tableId, bot.userId);
      }
    } catch {
      //The round moved on (maybe a player left) before the bot acted. Safe to ignore.
    }
  }, botTurnDelayMs());
};
