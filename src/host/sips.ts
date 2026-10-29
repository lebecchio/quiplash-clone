/** Beer sound for a donated sip: a glass clink, then a few gulps. Synthesized, no audio files. */
let ctx: AudioContext | null = null;

export function playSip() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx ??= new AC();
  void ctx.resume();
  const t = ctx.currentTime + 0.02;
  for (const [freq, at] of [[2637, 0], [3520, 0.04], [2093, 0.09]] as const) clink(ctx, freq, t + at);
  for (let i = 0; i < 3; i++) gulp(ctx, t + 0.45 + i * 0.32);
}

function clink(ctx: AudioContext, freq: number, t: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.5);
}

function gulp(ctx: AudioContext, t: number) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.2);
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}
