import { basicStrategy, botDifficulty, decideBotAction, isBot } from "../src/game/bots.js";

describe("bot identity", () => {
  test("recognises bot ids and reads their difficulty", () => {
    expect(isBot("bot-hard-x7f2")).toBe(true);
    expect(isBot("user_2abc")).toBe(false);
    expect(botDifficulty("bot-medium-k91a")).toBe("medium");
  });
});

describe("basic strategy lookup table", () => {
  test("always hits totals of 11 or less", () => {
    expect(basicStrategy(8, false, 10)).toBe("hit");
    expect(basicStrategy(11, false, 6)).toBe("hit");
  });

  test("always stands on hard 17 or more", () => {
    expect(basicStrategy(17, false, 10)).toBe("stand");
    expect(basicStrategy(20, false, 6)).toBe("stand");
  });

  test("hard 16 stands against a weak dealer but hits against a strong one", () => {
    expect(basicStrategy(16, false, 6)).toBe("stand"); //dealer likely to bust
    expect(basicStrategy(16, false, 10)).toBe("hit"); // dealer likely strong
  });

  test("hard 12 hits against dealer 2 and 3 but stands against 4 to 6", () => {
    expect(basicStrategy(12, false, 2)).toBe("hit");
    expect(basicStrategy(12, false, 4)).toBe("stand");
  });

  test("soft 18 stands against a weak dealer but hits against 9, 10 or Ace", () => {
    expect(basicStrategy(18, true, 6)).toBe("stand");
    expect(basicStrategy(18, true, 9)).toBe("hit");
    expect(basicStrategy(18, true, 11)).toBe("hit"); //11= ace
  });
});

describe("difficulty levels", () => {
  test("easy just mimics the dealer: hit under 17, stand otherwise", () => {
    expect(decideBotAction(16, false, 6, "easy")).toBe("hit"); //ignores the chart
    expect(decideBotAction(17, false, 10, "easy")).toBe("stand");
  });

  test("hard always matches the perfect lookup table", () => {
    expect(decideBotAction(16, false, 6, "hard")).toBe(basicStrategy(16, false, 6));
    expect(decideBotAction(12, false, 3, "hard")).toBe(basicStrategy(12, false, 3));
  });

  test("medium always returns a valid action", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(["hit", "stand"]).toContain(decideBotAction(15, false, 9, "medium"));
    }
  });
});
