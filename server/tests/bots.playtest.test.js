
// full round. you take seat 0, three bots fill the rest, you stand, and the bots play themselves to the finish. Run with npm run playtest
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { setFetchImpl } from "../src/services/deckOfCards.js";
import { calculateHandValue } from "../src/game/blackjack.js";
import { createTestApp } from "./createTestApp.js";
import Table from "../src/models/Table.js";
import Player from "../src/models/Player.js";
import Leaderboard from "../src/models/Leaderboard.js";
import TablePlayerRound from "../src/models/TablePlayerRound.js";
import { createMockFetch, queueDeckApiCards } from "./mockDeckApi.js";
import { clearAllTurnTimers } from "../src/services/turnTimer.js";

const card = (value) => {
  const code = `${value}-${Math.random().toString(36).slice(2, 5)}`;
  return { code, value, suit: "HEARTS", image: `https://deckofcardsapi.com/static/img/${code}.png` };
};

//predictable deck: opening two cards for you + three bots + the dealer, then a long tail of low cards so every hit resolves and the round finishes
const buildDeck = () => {
  const opening = [
    card("10"), card("7"), // user (seat 0),  17 but stand right away
    card("10"), card("6"), // easy bot
    card("9"), card("4"), //  medium bot
    card("10"), card("6"), // hard bot 
    card("10"), card("6") //  dealer(upcard 10)
  ];
  const tail = [];
  for (let i = 0; i < 40; i += 1) tail.push(card(i % 2 === 0 ? "2" : "3"));
  return [...opening, ...tail];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let mongod;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.BOT_TURN_DELAY_MS = "40"; //speed bots for playtest
  setFetchImpl(createMockFetch());
  mongod = await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
  await mongoose.connect(mongod.getUri());
  app = createTestApp();
  app.set("io", { to: () => ({ emit: () => {} }) }); //socket broadcasts no-op here
});

afterEach(async () => {
  clearAllTurnTimers();
  await Promise.all([
    Table.deleteMany({}),
    Player.deleteMany({}),
    Leaderboard.deleteMany({}),
    TablePlayerRound.deleteMany({})
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongod) await mongod.stop();
});

const waitForRoundComplete = async (tableId) => {
  for (let i = 0; i < 100; i += 1) {
    const res = await request(app).get(`/api/tables/${tableId}`).set("x-test-user-id", "you");
    if (res.body.gameState?.phase === "round-complete") return res.body;
    await sleep(80);
  }
  throw new Error("Round did not finish in time");
};

describe("bot playtest", () => {
  test("a solo host plus three bots plays a full round to completion", async () => {
    queueDeckApiCards(buildDeck());

    //creates a 4-seat table and fills the other three seats with bots
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "you")
      .send({ playerCount: 4, name: "Bot Playtest", bots: ["easy", "medium", "hard"] });
    const tableId = createRes.body.tableId;

    //host takes their seat so the round auto-starts.
    const joinRes = await request(app)
      .post(`/api/tables/${tableId}/join`)
      .set("x-test-user-id", "you")
      .send({ name: "You" });
    expect(joinRes.body.status).toBe("in_progress");
    expect(joinRes.body.gameState.players).toHaveLength(4);

    //user turn first, stand
    await request(app)
      .post(`/api/tables/${tableId}/action`)
      .set("x-test-user-id", "you")
      .send({ action: "stand" });

    // bots play themselves
    const finished = await waitForRoundComplete(tableId);

    //show what happened seat by seat
    console.log("\n===== BOT PLAYTEST RESULT =====");
    finished.gameState.players.forEach((seat) => {
      const kind = seat.id.startsWith("bot-") ? seat.id.split("-")[1] : "human";
      console.log(
        `  ${kind.padEnd(6)} ${seat.name.padEnd(10)} total ${String(seat.handTotal).padStart(2)}   ${seat.result}`
      );
    });
    const dealerTotal = calculateHandValue(finished.gameState.dealerHand);
    console.log(`  dealer                total ${String(dealerTotal).padStart(2)}`);
    console.log("================================\n");

    //Assert the feature works end to end 
    expect(finished.gameState.phase).toBe("round-complete");
    expect(finished.gameState.players).toHaveLength(4);
    finished.gameState.players.forEach((seat) => {
      expect(seat.result).toBeTruthy(); //win/ lose/ push/ bust, everyone finished
    });
    const botSeats = finished.gameState.players.filter((seat) => seat.id.startsWith("bot-"));
    expect(botSeats).toHaveLength(3);
  });
});
