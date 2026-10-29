/** mulberry32: tiny seeded PRNG whose whole state is one 32-bit integer. */
export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  /** Current internal state; store it back into GameState.seed. */
  state(): number;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n) => Math.floor(next() * n), state: () => a };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ'; // no vowels: no accidental words

export function makeRoomCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += CODE_LETTERS[rng.int(CODE_LETTERS.length)];
  return code;
}
