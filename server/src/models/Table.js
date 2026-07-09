import mongoose from "mongoose";
import { cardSchema } from "./cardSchema.js";
import { TURN_DURATION_SECONDS } from "../config/gameConstants.js";

const tableSchema = new mongoose.Schema(
  {
    hostUserId: { type: String, required: true },
    name: { type: String, default: "Blackjack Academy Open" },
    startingChips: { type: Number, default: 1000 },
    rounds: { type: Number, enum: [3, 5, 10], default: 5 },
    expectedPlayers: { type: Number, min: 1, max: 5, required: true },
    joinedPlayers: { type: [String], default: [] },
    status: { type: String, enum: ["waiting", "in_progress", "finished", "closed"], default: "waiting" },
    deckId: { type: String, default: null },
    deckRemaining: { type: Number, default: 0 },
    dealerHand: { type: [cardSchema], default: [] },
    turnIndex: { type: Number, default: 0 },
    phase: {
      type: String,
      enum: ["waiting", "player_turns", "dealer_turn", "finished"],
      default: "waiting"
    },
    turnStartedAt: { type: Date, default: null },
    turnExpiresAt: { type: Date, default: null },
    turnDurationSeconds: { type: Number, default: TURN_DURATION_SECONDS },
    message: { type: String, default: "" },
    roundNumber: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "table" }
);

export default mongoose.model("Table", tableSchema);
