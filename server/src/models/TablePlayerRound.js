import mongoose from "mongoose";
import { cardSchema } from "./cardSchema.js";

const tablePlayerRoundSchema = new mongoose.Schema(
  {
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    playerId: { type: String, required: true },
    seatIndex: { type: Number, required: true },
    hand: { type: [cardSchema], default: [] },
    status: { type: String, enum: ["playing", "stood", "busted"], default: "playing" },
    result: {
      type: String,
      enum: ["Win", "Lose", "Push", "Bust", null],
      default: null
    }
  },
  { timestamps: true, collection: "tableplayerround" }
);

tablePlayerRoundSchema.index({ tableId: 1, playerId: 1 }, { unique: true });

export default mongoose.model("TablePlayerRound", tablePlayerRoundSchema);
