import type { PlayerInfo } from '../game/view';

export function Scoreboard({ players, meId, startRank = 1, plain }: { players: PlayerInfo[]; meId?: string; startRank?: number; plain?: boolean }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className={`scoreboard${plain ? ' plain' : ''}`}>
      {sorted.map((p, i) => (
        <li key={p.id} className={p.id === meId ? 'me' : ''}>
          <span className="rank">{i + startRank}</span>
          <span className="avatar">{p.avatar}</span>
          <span className="name">{p.name}</span>
          <span className="score">{p.score}</span>
        </li>
      ))}
    </ol>
  );
}
