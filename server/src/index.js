import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { connectDb } from "./config/db.js";
import { createApp } from "./app.js";
import { registerTableGame } from "./services/tableGame.js";

const runtimeEnv = process.env.NODE_ENV || "dev";
if (!["dev", "prod", "test"].includes(runtimeEnv)) {
  throw new Error("NODE_ENV must be one of: dev, prod, test");
}

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const app = createApp({ clientOrigin: CLIENT_ORIGIN });
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true
  }
});

app.set("io", io);
registerTableGame(io);

const start = async () => {
  try {
    await connectDb();
    httpServer.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
