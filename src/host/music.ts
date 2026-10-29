/**
 * A bouncy synthesized funk loop for the lobby, made with Web Audio so there are no
 * audio files to license or download.
 */
const BPM = 112;
const STEP = 60 / BPM / 4; // one 16th note, in seconds
const SWING = 0.28;

const BASS = [
  [36, 0, 36, 0, 48, 0, 36, 0, 40, 0, 41, 0, 43, 0, 41, 0],
  [41, 0, 41, 0, 53, 0, 41, 0, 43, 0, 43, 0, 46, 0, 43, 0],
];
const LEAD = [
  [72, 0, 0, 76, 0, 74, 0, 0, 72, 0, 69, 0, 67, 0, 0, 0],
  [74, 0, 0, 79, 0, 76, 0, 0, 74, 0, 72, 0, 69, 0, 67, 0],
];
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

export class LobbyMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;

  start() {
    if (this.timer) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx ??= new AC());
    void ctx.resume();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.master.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 1.5);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  }

  stop() {
    if (!this.timer || !this.ctx || !this.master) return;
    clearInterval(this.timer);
    this.timer = null;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  }

  private schedule() {
    const ctx = this.ctx!;
    while (this.nextTime < ctx.currentTime + 0.2) {
      const s = this.step % 32;
      const bar = s >> 4;
      const i = s & 15;
      const t = this.nextTime + (i % 2 === 1 ? STEP * SWING : 0);
      if (BASS[bar][i]) this.tone(midi(BASS[bar][i]), t, STEP * 1.6, 'sawtooth', 0.5, 500);
      if (LEAD[bar][i]) this.tone(midi(LEAD[bar][i]), t, STEP * 2.2, 'triangle', 0.35, 4000);
      if (i % 4 === 0) this.kick(t);
      if (i % 8 === 4) this.hit(t, 0.12, 1800, 0.5);
      if (i % 2 === 1) this.hit(t, 0.03, 7000, 0.18);
      this.nextTime += STEP;
      this.step++;
    }
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, cutoff: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(filter).connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private hit(t: number, dur: number, highpass: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}

/** Plays an audio file on repeat, with a short fade in and out. */
export class FileMusic {
  private audio: HTMLAudioElement;
  private fade: ReturnType<typeof setInterval> | null = null;

  constructor(url: string, private volume = 0.7) {
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.preload = 'auto';
  }

  start() {
    this.fadeTo(this.volume, () => {});
    this.audio.volume = this.audio.paused ? 0 : this.audio.volume;
    void this.audio.play().catch(() => {});
  }

  stop() {
    this.fadeTo(0, () => this.audio.pause());
  }

  private fadeTo(target: number, done: () => void) {
    if (this.fade) clearInterval(this.fade);
    this.fade = setInterval(() => {
      const v = this.audio.volume;
      const next = v + Math.sign(target - v) * 0.05;
      if (Math.abs(target - next) < 0.05) {
        this.audio.volume = target;
        clearInterval(this.fade!);
        this.fade = null;
        done();
      } else {
        this.audio.volume = Math.min(1, Math.max(0, next));
      }
    }, 60);
  }
}
