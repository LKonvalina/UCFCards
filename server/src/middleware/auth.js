import { getAuth } from "@clerk/express";

export const requireUser = (req, res, next) => {
  if (process.env.NODE_ENV === "test") {
    const headerUserId = req.headers["x-test-user-id"] ?? req.headers["x-user-id"];

    if (typeof headerUserId === "string" && headerUserId.trim()) {
      req.userId = headerUserId.trim();
      return next();
    }

    return res.status(401).json({ message: "Authentication required." });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ message: "Authentication required." });
  }

  req.userId = userId;
  return next();
};
