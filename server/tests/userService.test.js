import { resolveClerkEmail } from "../src/services/userService.js";

describe("resolveClerkEmail", () => {
  test("uses a verified primary Clerk email address", () => {
    expect(resolveClerkEmail({
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "player@example.com",
          verification: { status: "verified" }
        }
      ],
      externalAccounts: []
    })).toEqual({
      email: "player@example.com",
      emailVerified: true
    });
  });

  test("falls back to a verified OAuth email when email identifiers are disabled", () => {
    expect(resolveClerkEmail({
      primaryEmailAddressId: null,
      emailAddresses: [],
      externalAccounts: [
        {
          provider: "google",
          emailAddress: "oauth-player@example.com",
          verification: { status: "verified" }
        }
      ]
    })).toEqual({
      email: "oauth-player@example.com",
      emailVerified: true
    });
  });

  test("does not mark an unverified OAuth email as verified", () => {
    expect(resolveClerkEmail({
      primaryEmailAddressId: null,
      emailAddresses: [],
      externalAccounts: [
        {
          provider: "google",
          emailAddress: "unverified@example.com",
          verification: { status: "unverified" }
        }
      ]
    })).toEqual({
      email: "unverified@example.com",
      emailVerified: false
    });
  });
});
