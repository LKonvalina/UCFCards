import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import tableRoutes from "./routes/tables.js";
import userRoutes from "./routes/users.js";

export const createApp = ({ clientOrigin = "http://localhost:5173", enableClerk = true } = {}) => {
  const app = express();
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json());

  if (enableClerk && process.env.CLERK_SECRET_KEY && process.env.NODE_ENV !== "test") {
    app.use(clerkMiddleware());
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/users", userRoutes);
  app.use("/api/tables", tableRoutes);
  return app;
};
