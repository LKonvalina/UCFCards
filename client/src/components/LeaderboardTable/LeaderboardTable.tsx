import type { LeaderboardEntry } from '../../types';

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="table-wrap">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Chips</th>
            <th>Rounds Won</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr className={entry.isCurrentUser ? 'leaderboard-table__current' : ''} key={entry.playerId}>
              <td>#{entry.rank}</td>
              <td>
                <span className="table-player">
                  <span className="avatar avatar--small">{entry.initials}</span>
                  {entry.player}
                </span>
              </td>
              <td>{entry.chips.toLocaleString()}</td>
              <td>{entry.roundsWon}</td>
              <td><span className="status-pill">{entry.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
