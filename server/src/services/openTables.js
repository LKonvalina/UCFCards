import Player from "../models/Player.js";
import Table from "../models/Table.js";

export const listJoinableTables = async (userId) => {
  const tables = await Table.find({
    status: "waiting",
    $expr: { $lt: [{ $size: "$joinedPlayers" }, "$expectedPlayers"] }
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!tables.length) {
    return [];
  }

  const seatedUserIds = [...new Set(tables.flatMap((table) => table.joinedPlayers))];
  const players = await Player.find({ userId: { $in: seatedUserIds } }).lean();
  const playerMap = new Map(players.map((player) => [player.userId, player]));

  return tables.map((table) => ({
    id: table._id,
    name: table.name,
    hostUserId: table.hostUserId,
    expectedPlayers: table.expectedPlayers,
    joinedCount: table.joinedPlayers.length,
    openSeats: table.expectedPlayers - table.joinedPlayers.length,
    startingChips: table.startingChips,
    rounds: table.rounds,
    alreadyJoined: table.joinedPlayers.includes(userId),
    players: table.joinedPlayers.map((playerId) => {
      const profile = playerMap.get(playerId);
      return {
        id: playerId,
        name: profile?.name ?? `Player ${playerId.slice(-4)}`,
        initials: profile?.initials ?? "P"
      };
    }),
    createdAt: table.createdAt
  }));
};
