import type { PlayerInfo } from '../game/view';

export function Scoreboard({ players, meId }: { players: PlayerInfo[]; meId?: string }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className="scoreboard">
      {sorted.map((p, i) => (
        <li key={p.id} className={p.id === meId ? 'me' : ''}>
          <span className="rank">{i + 1}</span>
          <span className="avatar">{p.avatar}</span>
          <span className="name">{p.name}</span>
          <span className="score">{p.score}</span>
        </li>
      ))}
    </ol>
  );
}
