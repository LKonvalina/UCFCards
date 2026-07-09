import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    fullName: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    lastLoginAt: { type: Date, default: Date.now }
  },
  { timestamps: true, collection: "users" }
);

export default mongoose.model("User", userSchema);
