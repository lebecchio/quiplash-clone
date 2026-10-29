import { allowsPlayerPrompts, noAnswerFor, packFor } from './packs';
import { avatarsFor, type ThemeId } from './avatars';
import { buildSlots, matchPrompts } from './assign';
import { makeRoomCode, mulberry32, shuffle, type Rng } from './rng';
import {
  ANSWER_SECONDS,
  FINAL_POINTS_PER_VOTE,
  FINAL_VOTES_PER_PLAYER,
  FINAL_VOTE_SECONDS,
  MAX_ANSWER_LEN,
  MAX_NAME_LEN,
  MAX_PLAYERS,
  MAX_PLAYER_PROMPTS,
  MAX_PROMPT_LEN,
  MIN_PLAYERS,
  QUIPLASH_BONUS,
  REVEAL_SECONDS,
  ROUND_PRIZE,
  SCORES_SECONDS,
  STATE_VERSION,
  VOTE_SECONDS,
  type Action,
  type GameState,
  type Matchup,
  type PlayerPrompt,
} from './types';

interface Ctx {
  s: GameState;
  rng: Rng;
}

export function createGame(opts: { seed: number; now?: number; pack?: string[]; theme?: ThemeId }): GameState {
  const rng = mulberry32(opts.seed);
  const roomCode = makeRoomCode(rng);
  const pack = opts.pack ?? packFor(opts.theme ?? 'default');
  return {
    version: STATE_VERSION,
    seed: rng.state(),
    roomCode,
    theme: opts.theme ?? 'default',
    now: opts.now ?? 0,
    phase: 'lobby',
    players: [],
    playerPrompts: [],
    pack,
    pool: shuffle(pack, rng),
    round: 0,
    matchups: [],
    current: 0,
    doublers: [],
    final: null,
    deadline: null,
    pausedAt: null,
  };
}

/** Pure: (state, action) -> new state. Never reads the clock; time comes from `action.now`. */
export function reduce(prev: GameState, action: Action): GameState {
  const s = structuredClone(prev);
  const rng = mulberry32(s.seed);
  const ctx: Ctx = { s, rng };
  s.now = action.now;
  apply(ctx, action);
  settle(ctx);
  s.seed = rng.state();
  return s;
}

// ---------- helpers ----------

export function vipId(s: GameState): string | null {
  return s.players.find((p) => p.connected)?.id ?? null;
}

export function connectedCount(s: GameState): number {
  return s.players.filter((p) => p.connected).length;
}

const clean = (text: string, max: number) => text.replace(/\s+/g, ' ').trim().slice(0, max);
const cleanAnswer = (text: string, theme: ThemeId) => clean(text, MAX_ANSWER_LEN) || noAnswerFor(theme);

function drawPackPrompt({ s, rng }: Ctx): string {
  if (s.pool.length === 0) s.pool = shuffle(s.pack, rng);
  return s.pool.pop() ?? 'Fill in the blank: ____';
}

function setDeadline(s: GameState, seconds: number) {
  s.deadline = s.now + seconds * 1000;
}

// ---------- actions ----------

function apply(ctx: Ctx, a: Action) {
  const { s } = ctx;
  const player = 'playerId' in a ? s.players.find((p) => p.id === a.playerId) : undefined;
  if ('playerId' in a && !player) return;

  switch (a.type) {
    case 'tick':
      if (s.pausedAt === null && s.deadline !== null && s.now >= s.deadline) advance(ctx);
      return;
    case 'newRoomCode':
      if (s.phase === 'lobby') s.roomCode = makeRoomCode(ctx.rng);
      return;
    case 'join': {
      const existing = s.players.find((p) => p.token === a.token);
      if (existing) {
        existing.connected = true;
        return;
      }
      if (s.phase !== 'lobby' || s.players.length >= MAX_PLAYERS) return;
      const base = clean(a.name, MAX_NAME_LEN);
      if (!base || !a.token) return;
      let name = base;
      for (let n = 2; s.players.some((p) => p.name.toLowerCase() === name.toLowerCase()); n++) {
        name = `${base.slice(0, MAX_NAME_LEN - 3)} ${n}`;
      }
      const set = avatarsFor(s.theme);
      const free = set.filter((x) => !s.players.some((p) => p.avatar === x));
      const avatar = a.avatar && free.includes(a.avatar) ? a.avatar : (free[0] ?? set[0]);
      s.players.push({ id: `p${s.players.length + 1}`, token: a.token, name, avatar, connected: true, score: 0 });
      return;
    }
    case 'reconnect':
      player!.connected = true;
      return;
    case 'disconnect':
      player!.connected = false;
      return;
    case 'submitPrompt': {
      if (s.phase !== 'lobby' || !allowsPlayerPrompts(s.theme)) return;
      const text = clean(a.text, MAX_PROMPT_LEN);
      const mine = s.playerPrompts.filter((p) => p.authorId === a.playerId);
      if (!text || mine.length >= MAX_PLAYER_PROMPTS) return;
      if (mine.some((p) => p.text.toLowerCase() === text.toLowerCase())) return;
      s.playerPrompts.push({ authorId: a.playerId, text, used: false });
      return;
    }
    case 'answer': {
      if (s.phase === 'answering') {
        const m = s.matchups[a.matchupId];
        const idx = m ? m.answerers.indexOf(a.playerId) : -1;
        if (idx >= 0 && m.answers[idx] === null) m.answers[idx] = cleanAnswer(a.text, s.theme);
      } else if (s.phase === 'finalAnswering' && s.final) {
        s.final.submitted[a.playerId] ??= cleanAnswer(a.text, s.theme);
      }
      return;
    }
    case 'vote': {
      const m = s.matchups[s.current];
      if (s.phase !== 'voting' || !m || m.answerers.includes(a.playerId)) return;
      if (a.choice === 0 || a.choice === 1) m.votes[a.playerId] = a.choice;
      return;
    }
    case 'finalVote': {
      const f = s.final;
      if (s.phase !== 'finalVoting' || !f) return;
      const ids = [...new Set(a.answerIds)]
        .filter((i) => Number.isInteger(i) && f.answers[i] && f.answers[i].playerId !== a.playerId)
        .slice(0, FINAL_VOTES_PER_PLAYER);
      f.votes[a.playerId] = ids;
      return;
    }
    case 'start':
      if (s.phase === 'lobby' && vipId(s) === a.playerId && connectedCount(s) >= MIN_PLAYERS) startGame(ctx);
      return;
    case 'skipTimer':
      if (vipId(s) === a.playerId && s.pausedAt === null && s.deadline !== null) advance(ctx);
      return;
    case 'skipMatchup':
      if (vipId(s) !== a.playerId || s.pausedAt !== null) return;
      if (s.phase === 'voting') {
        s.matchups[s.current].skipped = true;
        nextMatchup(ctx);
      } else if (s.phase === 'reveal') advance(ctx);
      return;
    case 'endGame':
      if (vipId(s) === a.playerId && s.phase !== 'lobby' && s.phase !== 'gameOver') enterGameOver(s);
      return;
    case 'playAgain':
      if (vipId(s) === a.playerId && s.phase === 'gameOver') resetToLobby(ctx);
      return;
  }
}

// ---------- phase machine ----------

function startGame(ctx: Ctx) {
  const { s, rng } = ctx;
  s.players = s.players.filter((p) => p.connected);
  s.pool = shuffle(s.pack, rng);
  s.doublers = [];
  for (const p of s.players) p.score = 0;
  startRound(ctx, 1);
}

function startRound(ctx: Ctx, round: 1 | 2) {
  const { s, rng } = ctx;
  const { slots, doubler } = buildSlots(
    s.players.map((p) => p.id),
    rng,
    s.doublers,
  );
  if (doubler) s.doublers.push(doubler);

  const candidates: PlayerPrompt[] = shuffle(
    s.playerPrompts.filter((p) => !p.used),
    rng,
  );
  const placed = matchPrompts(slots, candidates);
  const matchups: Matchup[] = slots.map((slot, i) => {
    const c = placed[i] === -1 ? null : candidates[placed[i]];
    if (c) c.used = true;
    return {
      prompt: c ? c.text : drawPackPrompt(ctx),
      authorId: c ? c.authorId : null,
      answerers: slot,
      answers: [null, null],
      votes: {},
      points: [0, 0],
      quiplash: false,
      skipped: false,
    };
  });
  s.round = round;
  s.matchups = shuffle(matchups, rng);
  s.current = 0;
  s.phase = 'answering';
  setDeadline(s, ANSWER_SECONDS);
}

function enterVoting(s: GameState, index: number) {
  s.current = index;
  s.phase = 'voting';
  setDeadline(s, VOTE_SECONDS);
}

function nextMatchup(ctx: Ctx) {
  const { s } = ctx;
  if (s.current + 1 < s.matchups.length) {
    enterVoting(s, s.current + 1);
  } else {
    s.phase = 'roundScores';
    setDeadline(s, SCORES_SECONDS);
  }
}

function scoreMatchup(s: GameState) {
  const m = s.matchups[s.current];
  const round = s.round as 1 | 2;
  const tally: [number, number] = [0, 0];
  for (const choice of Object.values(m.votes)) tally[choice]++;
  const total = tally[0] + tally[1];
  if (total === 0) return;
  const prize = ROUND_PRIZE[round];
  m.quiplash = tally[0] === total || tally[1] === total;
  m.points = [0, 1].map((i) => {
    const share = Math.round((prize * tally[i]) / total);
    return share + (m.quiplash && tally[i] === total ? QUIPLASH_BONUS[round] : 0);
  }) as [number, number];
  m.answerers.forEach((id, i) => {
    s.players.find((p) => p.id === id)!.score += m.points[i];
  });
}

function enterFinal(ctx: Ctx) {
  const { s } = ctx;
  s.round = 3;
  s.final = { prompt: drawPackPrompt(ctx), submitted: {}, answers: [], votes: {}, points: [] };
  s.phase = 'finalAnswering';
  setDeadline(s, ANSWER_SECONDS);
}

function enterGameOver(s: GameState) {
  s.phase = 'gameOver';
  s.deadline = null;
  s.pausedAt = null;
}

function resetToLobby({ s, rng }: Ctx) {
  s.phase = 'lobby';
  s.round = 0;
  s.matchups = [];
  s.current = 0;
  s.final = null;
  s.playerPrompts = [];
  s.doublers = [];
  s.pool = shuffle(s.pack, rng);
  s.deadline = null;
  s.pausedAt = null;
  for (const p of s.players) p.score = 0;
}

/** The current phase's timer ran out (or the VIP skipped it). */
function advance(ctx: Ctx) {
  const { s } = ctx;
  switch (s.phase) {
    case 'answering':
      for (const m of s.matchups) m.answers = m.answers.map((x) => x ?? noAnswerFor(s.theme)) as [string, string];
      enterVoting(s, 0);
      return;
    case 'voting':
      scoreMatchup(s);
      s.phase = 'reveal';
      setDeadline(s, REVEAL_SECONDS);
      return;
    case 'reveal':
      nextMatchup(ctx);
      return;
    case 'roundScores':
      if (s.round === 1) startRound(ctx, 2);
      else enterFinal(ctx);
      return;
    case 'finalAnswering': {
      const f = s.final!;
      const entries = s.players.map((p) => ({ playerId: p.id, text: f.submitted[p.id] ?? noAnswerFor(s.theme) }));
      f.answers = shuffle(entries, ctx.rng);
      f.points = f.answers.map(() => 0);
      s.phase = 'finalVoting';
      setDeadline(s, FINAL_VOTE_SECONDS);
      return;
    }
    case 'finalVoting': {
      const f = s.final!;
      for (const ids of Object.values(f.votes)) {
        for (const i of ids) {
          f.points[i] += FINAL_POINTS_PER_VOTE;
          s.players.find((p) => p.id === f.answers[i].playerId)!.score += FINAL_POINTS_PER_VOTE;
        }
      }
      s.phase = 'finalResults';
      setDeadline(s, SCORES_SECONDS);
      return;
    }
    case 'finalResults':
      enterGameOver(s);
      return;
    default:
      return;
  }
}

// ---------- pause and early finish ----------

/** True when everyone who is connected has finished the current phase's task. */
function allDone(s: GameState): boolean {
  const connected = s.players.filter((p) => p.connected);
  switch (s.phase) {
    case 'answering':
      return connected.every((p) =>
        s.matchups.every((m) => {
          const i = m.answerers.indexOf(p.id);
          return i < 0 || m.answers[i] !== null;
        }),
      );
    case 'voting': {
      const m = s.matchups[s.current];
      return connected.every((p) => m.answerers.includes(p.id) || p.id in m.votes);
    }
    case 'finalAnswering':
      return connected.every((p) => p.id in s.final!.submitted);
    case 'finalVoting':
      return connected.every((p) => p.id in s.final!.votes);
    default:
      return false;
  }
}

function settle(ctx: Ctx) {
  const { s } = ctx;
  if (s.phase === 'lobby' || s.phase === 'gameOver') {
    s.pausedAt = null;
    return;
  }
  const tooFew = connectedCount(s) < MIN_PLAYERS;
  if (tooFew && s.pausedAt === null) {
    s.pausedAt = s.now;
  } else if (!tooFew && s.pausedAt !== null) {
    if (s.deadline !== null) s.deadline += s.now - s.pausedAt;
    s.pausedAt = null;
  }
  for (let i = 0; i < 4 && s.pausedAt === null && allDone(s); i++) advance(ctx);
}
