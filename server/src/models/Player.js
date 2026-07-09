import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    initials: { type: String, required: true }
  },
  { timestamps: true, collection: "player" }
);

export default mongoose.model("Player", playerSchema);
