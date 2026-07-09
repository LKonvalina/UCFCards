import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { jest } from "@jest/globals";
import { createTestApp } from "./createTestApp.js";
import User from "../src/models/User.js";

jest.setTimeout(180000);

let mongod;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  mongod = await MongoMemoryServer.create({
    binary: { version: "7.0.14" }
  });
  await mongoose.connect(mongod.getUri());
  app = createTestApp();
});

afterEach(async () => {
  await User.deleteMany({});
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

describe("user routes", () => {
  test("syncs current user profile for authenticated test user", async () => {
    const response = await request(app)
      .get("/api/users/me")
      .set("x-test-user-id", "clerk_user_123");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: "clerk_user_123",
      email: "clerk_user_123@test.blackjackacademy.com",
      emailVerified: true,
      initials: expect.any(String)
    });

    const stored = await User.findOne({ clerkId: "clerk_user_123" });
    expect(stored).not.toBeNull();
    expect(stored.fullName).toBe("Test clerk_user_123");
  });

  test("rejects unauthenticated profile requests", async () => {
    const response = await request(app).get("/api/users/me");
    expect(response.status).toBe(401);
  });
});
