import { useEffect, useState } from 'react';

/** Counts down to a host-clock deadline. `offset` is hostClock - localClock. */
export function Countdown({ deadline, offset = 0, paused = false }: { deadline: number | null; offset?: number; paused?: boolean }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  if (deadline === null) return null;
  if (paused) return <div className="countdown">⏸</div>;
  const left = Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000));
  return <div className={`countdown${left <= 5 ? ' urgent' : ''}`}>{left}</div>;
}
