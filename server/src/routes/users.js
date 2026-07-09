import express from "express";
import { clerkClient } from "@clerk/express";
import { requireUser } from "../middleware/auth.js";
import { mapUserResponse, upsertTestUser, upsertUserFromClerk } from "../services/userService.js";

const router = express.Router();

router.get("/me", requireUser, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "test") {
      const user = await upsertTestUser(req.userId);
      return res.json(mapUserResponse(user));
    }

    const clerkUser = await clerkClient.users.getUser(req.userId);
    const user = await upsertUserFromClerk(clerkUser);
    return res.json(mapUserResponse(user));
  } catch (error) {
    return next(error);
  }
});

export default router;
