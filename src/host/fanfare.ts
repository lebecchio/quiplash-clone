/** Sounds for the final podium reveal: drumroll, a thud per place, and a winner fanfare. Synthesized. */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  void ctx.resume();
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

function hit(c: AudioContext, t: number, dur: number, highpass: number, vol: number) {
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  src.buffer = noise;
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function tone(c: AudioContext, freq: number, t: number, dur: number, type: OscillatorType, vol: number, cutoff = 3000) {
  const osc = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(filter).connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A snare roll that speeds up and gets louder. */
export function playDrumroll(seconds = 1.6) {
  const c = audio();
  if (!c) return;
  let t = c.currentTime + 0.05;
  const end = t + seconds;
  while (t < end) {
    const progress = 1 - (end - t) / seconds;
    hit(c, t, 0.09, 1500, 0.12 + 0.3 * progress);
    t += 0.17 - 0.12 * progress;
  }
}

/** A low thud and a bright pop as a runner-up lands on the podium. */
export function playPlace() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.02;
  const kick = c.createOscillator();
  const gain = c.createGain();
  kick.frequency.setValueAtTime(150, t);
  kick.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  gain.gain.setValueAtTime(0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  kick.connect(gain).connect(c.destination);
  kick.start(t);
  kick.stop(t + 0.35);
  tone(c, 880, t + 0.05, 0.25, 'triangle', 0.25);
  tone(c, 1318, t + 0.12, 0.3, 'triangle', 0.2);
}

/** Cymbal crash plus a rising brass arpeggio that lands on a held chord. */
export function playFanfare() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.02;
  hit(c, t, 1.4, 5000, 0.4);
  [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.13, 0.35, 'sawtooth', 0.22, 2500));
  const chord = t + 0.55;
  [523, 659, 784, 1047, 1319].forEach((f) => tone(c, f, chord, 1.6, 'sawtooth', 0.16, 3200));
}
