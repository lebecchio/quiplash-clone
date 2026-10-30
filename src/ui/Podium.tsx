import { useEffect, useState } from 'react';
import type { PlayerInfo } from '../game/view';
import { playDrumroll, playFanfare, playPlace } from '../host/fanfare';
import type { Strings } from '../i18n';
import { Confetti } from './Confetti';
import { Scoreboard } from './Scoreboard';

/** Pause before the first place appears, then the gap between places. */
const INTRO_MS = 1800;
const STEP_MS = 2600;
/** Phones wait this long so the big-screen reveal isn't spoiled. */
export const PODIUM_MS = INTRO_MS + STEP_MS * 3 + 1000;

const MEDALS = ['🥇', '🥈', '🥉'];
// Classic podium layout: second place on the left, winner in the middle, third on the right.
const DISPLAY_ORDER = [1, 0, 2];

function useCountUp(target: number, active: boolean, ms = 1300) {
  const [value, setValue] = useState(active ? 0 : target);
  useEffect(() => {
    if (!active) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setValue(target);
    const start = performance.now();
    let raf = requestAnimationFrame(function frame(now) {
      const k = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, active, ms]);
  return value;
}

function Slot({ player, place, shown }: { player: PlayerInfo; place: number; shown: boolean }) {
  const score = useCountUp(player.score, shown);
  return (
    <li className={`podium-slot place-${place + 1}${shown ? ' shown' : ''}`}>
      {place === 0 && <div className="crown">👑</div>}
      <div className="podium-avatar">{player.avatar}</div>
      <div className="podium-name">{player.name}</div>
      <div className="podium-score">{score}</div>
      <div className="podium-bar">
        <span>{MEDALS[place]}</span>
      </div>
    </li>
  );
}

/** Game-over screen: drumroll, then third, second and first place rise one by one, then everyone else. */
export function Podium({ players, s, sound }: { players: PlayerInfo[]; s: Strings; sound: boolean }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const [step, setStep] = useState(0);

  // step n (1..top.length) reveals the place top.length - n; the step after that shows the rest.
  useEffect(() => {
    const timers = Array.from({ length: top.length + 1 }, (_, i) =>
      setTimeout(() => setStep(i + 1), i === top.length ? INTRO_MS + STEP_MS * (top.length - 1) + 2400 : INTRO_MS + STEP_MS * i),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.length]);

  useEffect(() => {
    if (!sound) return;
    if (step === 0) playDrumroll((INTRO_MS - 100) / 1000);
    else if (step === top.length) playFanfare();
    else if (step < top.length) playPlace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sound]);

  const winnerShown = step >= top.length;
  const winner = top[0];
  return (
    <section className="podium-screen">
      <h1 className={winnerShown ? 'winner-title' : ''}>
        {winnerShown && winner ? s.podiumWins(winner.name) : s.podiumIntro}
      </h1>
      <ol className="podium">
        {DISPLAY_ORDER.filter((p) => top[p]).map((p) => (
          <Slot key={top[p].id} player={top[p]} place={p} shown={step >= top.length - p} />
        ))}
      </ol>
      {winnerShown && <Confetti />}
      {step > top.length && rest.length > 0 && <Scoreboard players={rest} startRank={4} plain />}
      {step > top.length && <p className="muted">{s.playAgainHint}</p>}
    </section>
  );
}
