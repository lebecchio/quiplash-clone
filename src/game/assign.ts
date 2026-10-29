import type { Rng } from './rng';
import { shuffle } from './rng';

export interface Candidate {
  text: string;
  authorId: string | null;
}

/**
 * Builds the answer slots for one round. A slot is the pair of players who answer
 * the same prompt.
 *  - 3 to 8 players: a ring, player i gets prompts i and i+1 (slot k = players k and k-1).
 *  - 9 to 12 players: players are paired up. With an odd count the leftover player is
 *    paired with a "doubler" who answers a second prompt; a doubler is never repeated.
 */
export function buildSlots(
  playerIds: string[],
  rng: Rng,
  previousDoublers: string[],
): { slots: [string, string][]; doubler: string | null } {
  const order = shuffle(playerIds, rng);
  const n = order.length;
  if (n <= 8) {
    return { slots: order.map((id, k) => [id, order[(k + n - 1) % n]] as [string, string]), doubler: null };
  }
  const slots: [string, string][] = [];
  const paired = n % 2 === 0 ? n : n - 1;
  for (let i = 0; i < paired; i += 2) slots.push([order[i], order[i + 1]]);
  let doubler: string | null = null;
  if (n % 2 === 1) {
    const leftover = order[n - 1];
    const eligible = order.slice(0, n - 1).filter((id) => !previousDoublers.includes(id));
    const pool = eligible.length > 0 ? eligible : order.slice(0, n - 1);
    doubler = pool[rng.int(pool.length)];
    slots.push([leftover, doubler]);
  }
  return { slots, doubler };
}

/**
 * Assigns as many player-written prompts as possible to slots such that nobody
 * answers a prompt they wrote (bipartite matching). Returns, per slot, the index of
 * the candidate placed there, or -1 for a slot that still needs a pack prompt.
 */
export function matchPrompts(slots: [string, string][], candidates: Candidate[]): number[] {
  const slotOf: number[] = Array(slots.length).fill(-1);
  const valid = (c: number, s: number) => {
    const author = candidates[c].authorId;
    return author === null || (slots[s][0] !== author && slots[s][1] !== author);
  };
  const place = (c: number, seen: boolean[]): boolean => {
    for (let s = 0; s < slots.length; s++) {
      if (seen[s] || !valid(c, s)) continue;
      seen[s] = true;
      if (slotOf[s] === -1 || place(slotOf[s], seen)) {
        slotOf[s] = c;
        return true;
      }
    }
    return false;
  };
  for (let c = 0; c < candidates.length; c++) place(c, Array(slots.length).fill(false));
  return slotOf;
}
