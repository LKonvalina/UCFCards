import mongoose from "mongoose";

const tournamentScheduleSchema = new mongoose.Schema(
  {
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    hostUserId: { type: String, required: true },
    title: { type: String, default: "Blackjack Learning Tournament" },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    playerIds: { type: [String], default: [] },
    description: { type: String, default: "Educational blackjack tournament. No gambling." }
  },
  { timestamps: true }
);

export default mongoose.model("TournamentSchedule", tournamentScheduleSchema);
