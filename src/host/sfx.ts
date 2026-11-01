/** Short synthesized effects for the big screen: countdown ticks, phase whooshes and reveal dings. */
import { audio, hit, tone } from './fanfare';

/** A woodblock tick for the last seconds of a timer. The final three are higher and louder. */
export function playTick(secondsLeft: number) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const urgent = secondsLeft <= 3;
  tone(c, urgent ? 1320 : 880, t, 0.12, 'square', urgent ? 0.14 : 0.08, 2500);
}

/** A rising noise sweep with a soft pop, as a new phase starts. */
export function playWhoosh() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  for (let i = 0; i < 5; i++) hit(c, t + i * 0.05, 0.12, 800 + i * 900, 0.05 + i * 0.02);
  tone(c, 660, t + 0.22, 0.2, 'triangle', 0.16);
}

/** Two bright bell notes when a result is revealed. */
export function playDing() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  tone(c, 1047, t, 0.5, 'sine', 0.22, 6000);
  tone(c, 1568, t + 0.12, 0.7, 'sine', 0.18, 6000);
}
