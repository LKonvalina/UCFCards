import express from "express";
import cors from "cors";
import tableRoutes from "../src/routes/tables.js";
import userRoutes from "../src/routes/users.js";

export const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/users", userRoutes);
  app.use("/api/tables", tableRoutes);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ message: err.message });
  });
  return app;
};
