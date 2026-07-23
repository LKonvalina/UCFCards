import { createApp } from "../src/app.js";

describe("Clerk server configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  const originalSecretKey = process.env.CLERK_SECRET_KEY;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;

    if (originalPublishableKey === undefined) {
      delete process.env.CLERK_PUBLISHABLE_KEY;
    } else {
      process.env.CLERK_PUBLISHABLE_KEY = originalPublishableKey;
    }

    if (originalSecretKey === undefined) {
      delete process.env.CLERK_SECRET_KEY;
    } else {
      process.env.CLERK_SECRET_KEY = originalSecretKey;
    }
  });

  test("fails fast when production Clerk keys are missing", () => {
    process.env.NODE_ENV = "prod";
    delete process.env.CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;

    expect(() => createApp()).toThrow(
      "CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are required."
    );
  });
});
