import mongoose from "mongoose";
import { STARTING_CHIPS } from "../config/gameConstants.js";

const leaderboardSchema = new mongoose.Schema(
  {
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    playerId: { type: String, required: true },
    chips: { type: Number, default: STARTING_CHIPS },
    roundsWon: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "leaderboard" }
);

leaderboardSchema.index({ tableId: 1, playerId: 1 }, { unique: true });

export default mongoose.model("Leaderboard", leaderboardSchema);
