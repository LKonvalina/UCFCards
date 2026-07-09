import request from "supertest";
import { createTestApp } from "./createTestApp.js";

describe("health route", () => {
  const app = createTestApp();

  test("returns ok status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
