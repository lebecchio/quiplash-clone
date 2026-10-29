import { describe, expect, it } from 'vitest';
import { connectedCount, createGame, reduce, vipId } from './reducer';
import { viewFor } from './view';
import {
  ANSWER_SECONDS,
  MAX_ANSWER_LEN,
  NO_ANSWER,
  type Action,
  type GameState,
} from './types';
import { mulberry32 } from './rng';

type Act = Action extends infer A ? (A extends { now: number } ? Omit<A, 'now'> : never) : never;

/** Test harness: a fake clock plus a bunch of fake players. */
class Table {
  s: GameState;
  t = 1_000_000;
  constructor(public n: number, seed = 42, promptsEach = 0) {
    this.s = createGame({ seed, now: this.t });
    for (let i = 0; i < n; i++) this.do({ type: 'join', token: `tok${i}`, name: `P${i + 1}` });
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < promptsEach; k++) {
        this.do({ type: 'submitPrompt', playerId: `p${i + 1}`, text: `prompt ${i + 1}-${k}` });
      }
    }
  }
  do(a: Act) {
    this.s = reduce(this.s, { ...a, now: this.t } as Action);
  }
  advanceTime(ms: number) {
    this.t += ms;
    this.do({ type: 'tick' });
  }
  get ids() {
    return this.s.players.map((p) => p.id);
  }
  start() {
    this.do({ type: 'start', playerId: vipId(this.s)! });
  }
  /** Everyone answers everything. */
  answerAll() {
    if (this.s.phase === 'answering') {
      this.s.matchups.forEach((m, matchupId) => {
        for (const id of m.answerers) this.do({ type: 'answer', playerId: id, matchupId, text: `${id} says hi` });
      });
    } else {
      for (const id of this.ids) this.do({ type: 'answer', playerId: id, matchupId: 0, text: `${id} final` });
    }
  }
  /** Everyone eligible votes for answer 0. */
  voteAll(choice: 0 | 1 = 0) {
    const m = this.s.matchups[this.s.current];
    for (const id of this.ids) if (!m.answerers.includes(id)) this.do({ type: 'vote', playerId: id, choice });
  }
  /** Plays the entire game with deterministic random votes. */
  playThrough() {
    const rng = mulberry32(7);
    const rounds: GameState['matchups'][] = [];
    let guard = 0;
    while (this.s.phase !== 'gameOver' && guard++ < 500) {
      switch (this.s.phase) {
        case 'answering':
          rounds.push(this.s.matchups);
          this.answerAll();
          break;
        case 'voting':
          for (const id of this.ids) {
            if (!this.s.matchups[this.s.current].answerers.includes(id)) {
              this.do({ type: 'vote', playerId: id, choice: rng.next() < 0.5 ? 0 : 1 });
            }
          }
          break;
        case 'finalAnswering':
          this.answerAll();
          break;
        case 'finalVoting':
          for (const id of this.ids) {
            const k = this.s.final!.answers.map((_, i) => i).filter((i) => this.s.final!.answers[i].playerId !== id);
            this.do({ type: 'finalVote', playerId: id, answerIds: k.slice(0, 3) });
          }
          break;
        default:
          this.advanceTime(60_000);
      }
    }
    return rounds;
  }
}

describe('lobby', () => {
  it('first player is VIP and only the VIP can start', () => {
    const t = new Table(3);
    expect(vipId(t.s)).toBe('p1');
    t.do({ type: 'start', playerId: 'p2' });
    expect(t.s.phase).toBe('lobby');
    t.start();
    expect(t.s.phase).toBe('answering');
  });

  it('needs 3 connected players and caps at 12', () => {
    const t = new Table(2);
    t.start();
    expect(t.s.phase).toBe('lobby');
    const full = new Table(12);
    full.do({ type: 'join', token: 'late', name: 'Late' });
    expect(full.s.players).toHaveLength(12);
  });

  it('cleans names, dedupes them, and rejects joins after the lobby', () => {
    const t = new Table(0);
    t.do({ type: 'join', token: 'a', name: '  Sam   ' });
    t.do({ type: 'join', token: 'b', name: 'sam' });
    t.do({ type: 'join', token: 'c', name: '   ' });
    expect(t.s.players.map((p) => p.name)).toEqual(['Sam', 'sam 2']);
    t.do({ type: 'join', token: 'd', name: 'Dee' });
    t.start();
    t.do({ type: 'join', token: 'e', name: 'Too late' });
    expect(t.s.players).toHaveLength(3);
  });

  it('limits each player to 3 prompts', () => {
    const t = new Table(3, 1, 5);
    expect(t.s.playerPrompts.filter((p) => p.authorId === 'p1')).toHaveLength(3);
  });
});

describe('assignment', () => {
  for (let n = 3; n <= 12; n++) {
    it(`plays a full game with ${n} players`, () => {
      const t = new Table(n, 100 + n, 2);
      t.start();
      const rounds = t.playThrough();
      expect(t.s.phase).toBe('gameOver');
      expect(rounds).toHaveLength(2);

      const doubled: string[] = [];
      for (const matchups of rounds) {
        const counts: Record<string, number> = {};
        for (const m of matchups) {
          expect(new Set(m.answerers).size).toBe(2);
          if (m.authorId) expect(m.answerers).not.toContain(m.authorId);
          for (const id of m.answerers) counts[id] = (counts[id] ?? 0) + 1;
        }
        expect(Object.keys(counts)).toHaveLength(n);
        if (n <= 8) {
          expect(matchups).toHaveLength(n);
          expect(Object.values(counts).every((c) => c === 2)).toBe(true);
        } else {
          expect(matchups).toHaveLength(Math.ceil(n / 2));
          const twos = Object.entries(counts).filter(([, c]) => c === 2);
          expect(twos).toHaveLength(n % 2);
          doubled.push(...twos.map(([id]) => id));
        }
      }
      if (n % 2 === 1 && n >= 9) expect(new Set(doubled).size).toBe(2);
    });
  }

  it('uses player prompts first', () => {
    const t = new Table(5, 3, 1);
    t.start();
    const used = t.s.matchups.filter((m) => m.authorId !== null);
    expect(used).toHaveLength(5);
  });

  it('never gives someone their own prompt even when one player wrote many', () => {
    const t = new Table(3, 9, 0);
    for (let k = 0; k < 3; k++) t.do({ type: 'submitPrompt', playerId: 'p1', text: `mine ${k}` });
    t.start();
    for (const m of t.s.matchups) if (m.authorId) expect(m.answerers).not.toContain(m.authorId);
  });
});

describe('answers', () => {
  it('truncates to 45 characters and turns blanks into [no answer]', () => {
    const t = new Table(3);
    t.start();
    const m = t.s.matchups.findIndex((x) => x.answerers.includes('p1'));
    t.do({ type: 'answer', playerId: 'p1', matchupId: m, text: 'x'.repeat(100) });
    expect(t.s.matchups[m].answers[t.s.matchups[m].answerers.indexOf('p1')]).toHaveLength(MAX_ANSWER_LEN);
    const m2 = t.s.matchups.findIndex((x, i) => i !== m && x.answerers.includes('p1'));
    t.do({ type: 'answer', playerId: 'p1', matchupId: m2, text: '   ' });
    expect(t.s.matchups[m2].answers[t.s.matchups[m2].answerers.indexOf('p1')]).toBe(NO_ANSWER);
  });

  it('fills missing answers when time runs out', () => {
    const t = new Table(3);
    t.start();
    t.advanceTime(ANSWER_SECONDS * 1000 + 1);
    expect(t.s.phase).toBe('voting');
    expect(t.s.matchups.every((m) => m.answers.every((a) => a === NO_ANSWER))).toBe(true);
  });

  it('ignores answers from people not in the matchup', () => {
    const t = new Table(4);
    t.start();
    const idx = t.s.matchups.findIndex((m) => !m.answerers.includes('p1'));
    t.do({ type: 'answer', playerId: 'p1', matchupId: idx, text: 'sneaky' });
    expect(t.s.matchups[idx].answers).toEqual([null, null]);
  });
});

describe('voting and scoring', () => {
  it('authors cannot vote on their own matchup', () => {
    const t = new Table(4);
    t.start();
    t.answerAll();
    const m = t.s.matchups[0];
    t.do({ type: 'vote', playerId: m.answerers[0], choice: 0 });
    expect(m.votes).toEqual({});
    expect(t.s.matchups[0].votes[m.answerers[0]]).toBeUndefined();
    expect(t.s.matchups[0].votes).toEqual({});
  });

  it('round 1 splits 1000 by vote share, with a 250 quiplash bonus', () => {
    const t = new Table(5);
    t.start();
    t.answerAll();
    const m = t.s.matchups[0];
    const voters = t.ids.filter((id) => !m.answerers.includes(id));
    expect(voters).toHaveLength(3);
    // 2 vs 1 votes: 667 / 333
    t.do({ type: 'vote', playerId: voters[0], choice: 0 });
    t.do({ type: 'vote', playerId: voters[1], choice: 0 });
    t.do({ type: 'vote', playerId: voters[2], choice: 1 });
    expect(t.s.phase).toBe('reveal');
    expect(t.s.matchups[0].points).toEqual([667, 333]);
    expect(t.s.matchups[0].quiplash).toBe(false);
  });

  it('awards the quiplash bonus on a clean sweep', () => {
    const t = new Table(5);
    t.start();
    t.answerAll();
    t.voteAll(1);
    const m = t.s.matchups[0];
    expect(m.quiplash).toBe(true);
    expect(m.points).toEqual([0, 1250]);
    expect(t.s.players.find((p) => p.id === m.answerers[1])!.score).toBe(1250);
  });

  it('round 2 is worth 2000 with a 500 bonus', () => {
    const t = new Table(3);
    t.start();
    while (t.s.round === 1) {
      if (t.s.phase === 'answering') t.answerAll();
      else if (t.s.phase === 'voting') t.voteAll();
      else t.advanceTime(60_000);
    }
    expect(t.s.round).toBe(2);
    t.answerAll();
    t.voteAll(0);
    expect(t.s.matchups[t.s.current].points).toEqual([2500, 0]);
  });

  it('final round: 3 votes each, never on your own answer', () => {
    const t = new Table(4);
    t.start();
    while (t.s.phase !== 'finalAnswering') {
      if (t.s.phase === 'answering') t.answerAll();
      else if (t.s.phase === 'voting') t.voteAll();
      else t.advanceTime(60_000);
    }
    t.answerAll();
    expect(t.s.phase).toBe('finalVoting');
    const f = t.s.final!;
    const own = f.answers.findIndex((a) => a.playerId === 'p1');
    t.do({ type: 'finalVote', playerId: 'p1', answerIds: [own, 0, 1, 2, 3, 3] });
    expect(f.votes.p1).toBeUndefined();
    expect(t.s.final!.votes.p1).not.toContain(own);
    expect(t.s.final!.votes.p1.length).toBeLessThanOrEqual(3);
  });

  it('skipMatchup moves on without scoring', () => {
    const t = new Table(4);
    t.start();
    t.answerAll();
    t.do({ type: 'skipMatchup', playerId: 'p1' });
    expect(t.s.matchups[0].skipped).toBe(true);
    expect(t.s.current).toBe(1);
    expect(t.s.matchups[0].points).toEqual([0, 0]);
  });
});

describe('VIP commands', () => {
  it('only the VIP can skip timers or end the game', () => {
    const t = new Table(3);
    t.start();
    t.do({ type: 'skipTimer', playerId: 'p2' });
    expect(t.s.phase).toBe('answering');
    t.do({ type: 'skipTimer', playerId: 'p1' });
    expect(t.s.phase).toBe('voting');
    t.do({ type: 'endGame', playerId: 'p3' });
    expect(t.s.phase).toBe('voting');
    t.do({ type: 'endGame', playerId: 'p1' });
    expect(t.s.phase).toBe('gameOver');
  });

  it('play again keeps room and players but resets scores', () => {
    const t = new Table(4, 5, 1);
    t.start();
    t.playThrough();
    expect(t.s.players.some((p) => p.score > 0)).toBe(true);
    const code = t.s.roomCode;
    t.do({ type: 'playAgain', playerId: 'p2' });
    expect(t.s.phase).toBe('gameOver');
    t.do({ type: 'playAgain', playerId: 'p1' });
    expect(t.s.phase).toBe('lobby');
    expect(t.s.roomCode).toBe(code);
    expect(t.s.players).toHaveLength(4);
    expect(t.s.players.every((p) => p.score === 0)).toBe(true);
    expect(t.s.playerPrompts).toHaveLength(0);
    t.start();
    expect(t.s.phase).toBe('answering');
  });

  it('VIP passes to the next connected player if the VIP drops', () => {
    const t = new Table(4);
    t.do({ type: 'disconnect', playerId: 'p1' });
    expect(vipId(t.s)).toBe('p2');
    t.do({ type: 'reconnect', playerId: 'p1' });
    expect(vipId(t.s)).toBe('p1');
  });
});

describe('disconnects', () => {
  it('keeps going when a player drops and timers keep running', () => {
    const t = new Table(4);
    t.start();
    t.do({ type: 'disconnect', playerId: 'p4' });
    expect(t.s.pausedAt).toBeNull();
    t.advanceTime(ANSWER_SECONDS * 1000 + 1);
    expect(t.s.phase).toBe('voting');
  });

  it('pauses below 3 connected players and shifts the deadline on resume', () => {
    const t = new Table(4);
    t.start();
    const deadline = t.s.deadline!;
    t.do({ type: 'disconnect', playerId: 'p3' });
    t.do({ type: 'disconnect', playerId: 'p4' });
    expect(t.s.pausedAt).not.toBeNull();
    t.advanceTime(ANSWER_SECONDS * 1000 * 2);
    expect(t.s.phase).toBe('answering');
    t.do({ type: 'skipTimer', playerId: 'p1' });
    expect(t.s.phase).toBe('answering');
    t.do({ type: 'reconnect', playerId: 'p3' });
    expect(t.s.pausedAt).toBeNull();
    expect(t.s.deadline).toBe(deadline + ANSWER_SECONDS * 1000 * 2);
  });

  it('the VIP can end a paused game', () => {
    const t = new Table(3);
    t.start();
    t.do({ type: 'disconnect', playerId: 'p2' });
    expect(connectedCount(t.s)).toBe(2);
    t.do({ type: 'endGame', playerId: 'p1' });
    expect(t.s.phase).toBe('gameOver');
  });

  it('does not wait for disconnected players to answer', () => {
    const t = new Table(4);
    t.start();
    t.do({ type: 'disconnect', playerId: 'p4' });
    for (const id of ['p1', 'p2', 'p3']) {
      t.s.matchups.forEach((m, matchupId) => {
        if (m.answerers.includes(id)) t.do({ type: 'answer', playerId: id, matchupId, text: 'ok' });
      });
    }
    expect(t.s.phase).toBe('voting');
  });
});

describe('viewFor', () => {
  it('never leaks tokens', () => {
    const t = new Table(4, 1, 1);
    t.start();
    for (const who of [null, ...t.ids]) {
      expect(JSON.stringify(viewFor(t.s, who))).not.toContain('tok');
    }
  });

  it('shows nobody else\'s answers while answering', () => {
    const t = new Table(4);
    t.start();
    const m = t.s.matchups.findIndex((x) => x.answerers.includes('p1'));
    t.do({ type: 'answer', playerId: 'p2', matchupId: t.s.matchups.findIndex((x) => x.answerers.includes('p2')), text: 'SECRET2' });
    const v = viewFor(t.s, 'p1');
    expect(JSON.stringify(v)).not.toContain('SECRET2');
    expect(v.tasks!.length).toBeGreaterThan(0);
    expect(v.tasks![0].matchupId).toBe(m);
    expect(viewFor(t.s, null).tasks).toBeNull();
  });

  it('hides authors until the reveal', () => {
    const t = new Table(4);
    t.start();
    t.answerAll();
    expect(t.s.phase).toBe('voting');
    expect(viewFor(t.s, 'p1').matchup!.authors).toBeNull();
    expect(viewFor(t.s, null).matchup!.authors).toBeNull();
    t.voteAll();
    expect(t.s.phase).toBe('reveal');
    expect(viewFor(t.s, null).matchup!.authors).not.toBeNull();
  });

  it('flags the viewer as author of the current matchup', () => {
    const t = new Table(4);
    t.start();
    t.answerAll();
    const m = t.s.matchups[0];
    expect(viewFor(t.s, m.answerers[0]).matchup!.iAmAuthor).toBe(true);
  });
});

describe('determinism', () => {
  it('same seed and actions give the same game', () => {
    const run = () => {
      const t = new Table(7, 1234, 1);
      t.start();
      t.playThrough();
      return t.s;
    };
    expect(run()).toEqual(run());
  });

  it('different seeds give different rooms', () => {
    expect(createGame({ seed: 1 }).roomCode).not.toBe(createGame({ seed: 2 }).roomCode);
  });

  it('reduce does not mutate its input', () => {
    const t = new Table(3);
    const before = JSON.stringify(t.s);
    reduce(t.s, { type: 'start', playerId: 'p1', now: t.t });
    expect(JSON.stringify(t.s)).toBe(before);
  });

  it('can re-roll the room code in the lobby', () => {
    const t = new Table(0);
    const code = t.s.roomCode;
    t.do({ type: 'newRoomCode' });
    expect(t.s.roomCode).not.toBe(code);
  });
});

describe('avatars', () => {
  it('keeps a valid, free choice and falls back otherwise', () => {
    const t = new Table(0);
    t.do({ type: 'join', token: 'a', name: 'A', avatar: '🦄' });
    t.do({ type: 'join', token: 'b', name: 'B', avatar: '🦄' });
    t.do({ type: 'join', token: 'c', name: 'C', avatar: 'not-an-avatar' });
    const avatars = t.s.players.map((p) => p.avatar);
    expect(avatars[0]).toBe('🦄');
    expect(new Set(avatars).size).toBe(3);
  });
});
