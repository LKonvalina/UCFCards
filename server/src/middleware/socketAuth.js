import { verifyToken } from "@clerk/backend";

export const createSocketAuthMiddleware = () => {
  if (process.env.NODE_ENV === "test") {
    return (socket, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required for Socket.IO authentication.");
  }

  return async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required."));
      }

      const payload = await verifyToken(token, { secretKey });
      socket.data.userId = payload.sub;
      return next();
    } catch {
      return next(new Error("Invalid authentication token."));
    }
  };
};

export const resolveSocketUserId = (socket, requestedUserId) => {
  if (process.env.NODE_ENV === "test") {
    const userId = requestedUserId ?? socket.data.userId;
    if (!userId) {
      throw new Error("userId is required.");
    }

    socket.data.userId = userId;
    return userId;
  }

  const userId = socket.data.userId;
  if (!userId) {
    throw new Error("Authentication required.");
  }

  if (requestedUserId && requestedUserId !== userId) {
    throw new Error("Authenticated user does not match request.");
  }

  return userId;
};
