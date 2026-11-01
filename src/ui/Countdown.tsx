import { useEffect, useState } from 'react';

/** Counts down to a host-clock deadline. `offset` is hostClock - localClock. `onTick` fires each time the shown second changes. */
export function Countdown({
  deadline,
  offset = 0,
  paused = false,
  onTick,
}: {
  deadline: number | null;
  offset?: number;
  paused?: boolean;
  onTick?: (secondsLeft: number) => void;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  const left = deadline === null || paused ? null : Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000));
  useEffect(() => {
    if (left !== null) onTick?.(left);
  }, [left]);
  if (deadline === null) return null;
  if (left === null) return <div className="countdown">⏸</div>;
  return <div className={`countdown${left <= 5 ? ' urgent' : ''}`}>{left}</div>;
}
