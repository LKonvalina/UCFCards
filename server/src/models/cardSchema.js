import mongoose from "mongoose";

export const cardSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    value: { type: String, required: true },
    suit: {
      type: String,
      enum: ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"],
      required: true
    },
    image: { type: String, required: true },
    hidden: { type: Boolean, default: false }
  },
  { _id: false }
);
