import { TURN_DURATION_SECONDS } from "../config/gameConstants.js";

const timers = new Map();

export const clearTurnTimer = (tableId) => {
  const timer = timers.get(tableId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(tableId);
  }
};

export const clearAllTurnTimers = () => {
  for (const tableId of [...timers.keys()]) {
    clearTurnTimer(tableId);
  }
};

export const scheduleTurnTimer = (tableId, expiresAt, onExpire) => {
  clearTurnTimer(tableId);
  const delay = Math.max(new Date(expiresAt).getTime() - Date.now(), 0);
  const timer = setTimeout(() => {
    timers.delete(tableId);
    onExpire(tableId);
  }, delay);
  timers.set(tableId, timer);
};

export const startTurnClock = (table) => {
  const durationSeconds = table.turnDurationSeconds ?? TURN_DURATION_SECONDS;
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  table.turnStartedAt = startedAt;
  table.turnExpiresAt = expiresAt;
  return { startedAt, expiresAt, durationSeconds };
};
