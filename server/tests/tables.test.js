import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest } from "@jest/globals";
import { setFetchImpl } from "../src/services/deckOfCards.js";
import { createTestApp } from "./createTestApp.js";
import User from "../src/models/User.js";
import Table from "../src/models/Table.js";
import Player from "../src/models/Player.js";
import Leaderboard from "../src/models/Leaderboard.js";
import TablePlayerRound from "../src/models/TablePlayerRound.js";
import TournamentSchedule from "../src/models/TournamentSchedule.js";
import { createMockFetch, defaultOpeningCards, queueDeckApiCards } from "./mockDeckApi.js";
import { clearAllTurnTimers } from "../src/services/turnTimer.js";
import { TURN_DURATION_SECONDS } from "../src/config/gameConstants.js";

jest.setTimeout(180000);

let mongod;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  setFetchImpl(createMockFetch());
  mongod = await MongoMemoryServer.create({
    binary: { version: "7.0.14" }
  });
  await mongoose.connect(mongod.getUri());
  app = createTestApp();
  app.set("io", {
    to: () => ({
      emit: () => {}
    })
  });
});

beforeEach(() => {
  queueDeckApiCards(defaultOpeningCards());
});

afterEach(async () => {
  clearAllTurnTimers();
  await Table.deleteMany({});
  await User.deleteMany({});
  await Player.deleteMany({});
  await Leaderboard.deleteMany({});
  await TablePlayerRound.deleteMany({});
  await TournamentSchedule.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
});

describe("table routes", () => {
  test("creates table with valid player count", async () => {
    const response = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "p1")
      .send({ playerCount: 2 });

    expect(response.status).toBe(201);
    expect(response.body.tableId).toBeDefined();
  });

  test("rejects table count outside 1-5", async () => {
    const response = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "p1")
      .send({ playerCount: 6 });

    expect(response.status).toBe(400);
  });

  test("starts game when expected players have joined using deck API", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "p1")
      .send({ playerCount: 2 });

    const tableId = createRes.body.tableId;

    await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p1").send();
    const joinRes = await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p2").send();

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.status).toBe("in_progress");
    expect(joinRes.body.gameState.phase).toBe("player-turn");
    expect(joinRes.body.gameState.players).toHaveLength(2);
    expect(joinRes.body.gameState.players[0].hand[0]).toMatchObject({
      code: expect.any(String),
      value: expect.any(String),
      suit: expect.stringMatching(/HEARTS|DIAMONDS|CLUBS|SPADES/),
      image: expect.stringContaining("deckofcardsapi.com")
    });
    expect(joinRes.body.gameState.turnDurationSeconds).toBe(TURN_DURATION_SECONDS);
  });

  test("allows seated player to rejoin after round starts", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "p1")
      .send({ playerCount: 1 });

    const tableId = createRes.body.tableId;
    await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p1").send();
    const rejoinRes = await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p1").send();

    expect(rejoinRes.status).toBe(200);
    expect(rejoinRes.body.status).toBe("in_progress");
    expect(rejoinRes.body.gameState.phase).toBe("player-turn");
  });

  test("player can leave a waiting table without closing it when others remain", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "p1")
      .send({ playerCount: 2 });

    const tableId = createRes.body.tableId;
    await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p1").send();
    await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p2").send();

    const leaveRes = await request(app)
      .post(`/api/tables/${tableId}/leave`)
      .set("x-test-user-id", "p2")
      .send();

    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.status).toBe("in_progress");

    const table = await Table.findById(tableId);
    expect(table.joinedPlayers).toEqual(["p1"]);
  });

  test("closes tournament round when last player leaves during a game", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "p1")
      .send({ playerCount: 1 });

    const tableId = createRes.body.tableId;
    await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "p1").send();

    const leaveRes = await request(app)
      .post(`/api/tables/${tableId}/leave`)
      .set("x-test-user-id", "p1")
      .send();

    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.status).toBe("closed");
    expect(leaveRes.body.message).toContain("all players left");

    const table = await Table.findById(tableId);
    expect(table.status).toBe("closed");
    expect(table.joinedPlayers).toHaveLength(0);
  });

  test("allows host to deal next hand after round completes", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "host")
      .send({ playerCount: 1 });

    const tableId = createRes.body.tableId;
    await request(app).post(`/api/tables/${tableId}/join`).set("x-test-user-id", "host").send({ name: "Host" });

    const table = await Table.findById(tableId);
    table.status = "finished";
    table.phase = "finished";
    await table.save();
    await TablePlayerRound.updateOne(
      { tableId, playerId: "host" },
      { result: "Win", status: "stood" },
      { upsert: true, setDefaultsOnInsert: true }
    );

    const nextHandRes = await request(app)
      .post(`/api/tables/${tableId}/round/start`)
      .set("x-test-user-id", "host")
      .send();

    expect(nextHandRes.status).toBe(200);
    expect(nextHandRes.body.status).toBe("in_progress");
    expect(nextHandRes.body.gameState.phase).toBe("player-turn");
    expect(nextHandRes.body.gameState.players[0].hand).toHaveLength(2);
  });

  test("lists open waiting tables with available seats", async () => {
    const create1 = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "host1")
      .send({ playerCount: 3, name: "Table A" });

    const create2 = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "host2")
      .send({ playerCount: 2, name: "Table B" });

    const tableId2 = create2.body.tableId;
    await request(app).post(`/api/tables/${tableId2}/join`).set("x-test-user-id", "p2").send();

    const listRes = await request(app).get("/api/tables/open").set("x-test-user-id", "browser");

    expect(listRes.status).toBe(200);
    expect(listRes.body.tables).toHaveLength(1);
    expect(listRes.body.tables[0]).toMatchObject({
      name: "Table A",
      expectedPlayers: 3,
      joinedCount: 1,
      openSeats: 2
    });
  });

  test("player can join a table discovered from the open list", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "host")
      .send({ playerCount: 2, name: "Discovery Table", startingChips: 1500, rounds: 3 });

    const tableId = createRes.body.tableId;

    const listRes = await request(app).get("/api/tables/open").set("x-test-user-id", "guest");
    expect(listRes.body.tables[0].id).toBe(tableId);

    const joinRes = await request(app)
      .post(`/api/tables/${tableId}/join`)
      .set("x-test-user-id", "guest")
      .send({ name: "Guest Player" });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.status).toBe("in_progress");
    expect(joinRes.body.joinedPlayers).toContain("guest");
  });

  test("host can schedule a tournament", async () => {
    const createRes = await request(app)
      .post("/api/tables")
      .set("x-test-user-id", "host")
      .send({ playerCount: 2 });

    const tableId = createRes.body.tableId;
    const start = new Date("2026-07-10T18:00:00.000Z");
    const end = new Date("2026-07-10T19:00:00.000Z");

    const scheduleRes = await request(app)
      .post(`/api/tables/${tableId}/schedule`)
      .set("x-test-user-id", "host")
      .send({ scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() });

    expect(scheduleRes.status).toBe(201);
    expect(scheduleRes.body.scheduleId).toBeDefined();
    expect(new Date(scheduleRes.body.scheduledStart).toISOString()).toBe(start.toISOString());
    expect(new Date(scheduleRes.body.scheduledEnd).toISOString()).toBe(end.toISOString());
  });
});
