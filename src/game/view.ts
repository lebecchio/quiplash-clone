import type { ThemeId } from './avatars';
import { allowsPlayerPrompts } from './packs';
import { vipId } from './reducer';
import { FINAL_POINTS_PER_VOTE, FINAL_VOTES_PER_PLAYER, MAX_PLAYER_PROMPTS, MIN_PLAYERS, type GameState, type Phase } from './types';

export interface PlayerInfo {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
  score: number;
  isVip: boolean;
  /** Has finished the current phase's task (answered, voted, ...). */
  done: boolean;
}

export interface Task {
  matchupId: number;
  prompt: string;
  answer: string | null;
}

export interface MatchupView {
  index: number;
  total: number;
  prompt: string;
  answers: [string, string];
  /** Only set once the matchup is revealed. */
  authors: [string, string] | null;
  votes: [number, number] | null;
  points: [number, number] | null;
  quiplash: boolean;
  iAmAuthor: boolean;
  myVote: 0 | 1 | null;
}

export interface FinalAnswerView {
  index: number;
  text: string;
  mine: boolean;
  /** Only set in finalResults. */
  author: string | null;
  votes: number | null;
  points: number | null;
}

export interface FinalView {
  prompt: string;
  answered: boolean;
  /** Empty before voting starts. */
  answers: FinalAnswerView[];
  myVotes: number[] | null;
  maxVotes: number;
}

export interface QuizView {
  index: number;
  total: number;
  question: string;
  options: string[];
  myChoice: number | null;
  /** Everything below is only set once the answer is revealed. */
  correct: number | null;
  counts: number[] | null;
  myPoints: number | null;
  winners: { name: string; avatar: string; points: number }[] | null;
}

export interface View {
  role: 'host' | 'player';
  roomCode: string;
  theme: ThemeId;
  phase: Phase;
  /** Host clock at send time, so phones can correct for clock skew. */
  now: number;
  deadline: number | null;
  paused: boolean;
  round: number;
  players: PlayerInfo[];
  me: { id: string; name: string; avatar: string; isVip: boolean } | null;
  lobby: { canStart: boolean; minPlayers: number; myPrompts: string[]; maxPrompts: number; promptCount: number } | null;
  tasks: Task[] | null;
  matchup: MatchupView | null;
  final: FinalView | null;
  quiz: QuizView | null;
}

/** What one client may see. `playerId === null` is the shared host screen. */
export function viewFor(s: GameState, playerId: string | null): View {
  const me = playerId ? s.players.find((p) => p.id === playerId) : undefined;
  const vip = vipId(s);
  const phase = s.phase;

  const done = (id: string): boolean => {
    switch (phase) {
      case 'answering':
        return s.matchups.every((m) => {
          const i = m.answerers.indexOf(id);
          return i < 0 || m.answers[i] !== null;
        });
      case 'voting': {
        const m = s.matchups[s.current];
        return m.answerers.includes(id) || id in m.votes;
      }
      case 'quiz':
        return id in s.quiz!.answers;
      case 'finalAnswering':
        return id in s.final!.submitted;
      case 'finalVoting':
        return id in s.final!.votes;
      default:
        return false;
    }
  };

  const view: View = {
    role: me ? 'player' : 'host',
    roomCode: s.roomCode,
    theme: s.theme,
    phase,
    now: s.now,
    deadline: s.deadline,
    paused: s.pausedAt !== null,
    round: s.round,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      score: p.score,
      isVip: p.id === vip,
      done: done(p.id),
    })),
    me: me ? { id: me.id, name: me.name, avatar: me.avatar, isVip: me.id === vip } : null,
    lobby: null,
    tasks: null,
    matchup: null,
    final: null,
    quiz: null,
  };

  if (phase === 'lobby') {
    view.lobby = {
      canStart: s.players.filter((p) => p.connected).length >= MIN_PLAYERS,
      minPlayers: MIN_PLAYERS,
      myPrompts: me ? s.playerPrompts.filter((p) => p.authorId === me.id).map((p) => p.text) : [],
      maxPrompts: allowsPlayerPrompts(s.theme) ? MAX_PLAYER_PROMPTS : 0,
      promptCount: s.playerPrompts.length,
    };
  }

  if (phase === 'answering' && me) {
    view.tasks = s.matchups.flatMap((m, matchupId) => {
      const i = m.answerers.indexOf(me.id);
      return i < 0 ? [] : [{ matchupId, prompt: m.prompt, answer: m.answers[i] }];
    });
  }

  if (phase === 'voting' || phase === 'reveal') {
    const m = s.matchups[s.current];
    const revealed = phase === 'reveal';
    const tally: [number, number] = [0, 0];
    for (const c of Object.values(m.votes)) tally[c]++;
    view.matchup = {
      index: s.current,
      total: s.matchups.length,
      prompt: m.prompt,
      answers: [m.answers[0] ?? '', m.answers[1] ?? ''],
      authors: revealed
        ? [name(s, m.answerers[0]), name(s, m.answerers[1])]
        : null,
      votes: revealed ? tally : null,
      points: revealed ? m.points : null,
      quiplash: revealed && m.quiplash,
      iAmAuthor: !!me && m.answerers.includes(me.id),
      myVote: me && me.id in m.votes ? m.votes[me.id] : null,
    };
  }

  if (s.quiz && (phase === 'quiz' || phase === 'quizReveal')) {
    const q = s.quiz;
    const question = q.questions[q.index];
    const revealed = phase === 'quizReveal';
    const counts = [0, 0, 0, 0];
    for (const { choice } of Object.values(q.answers)) counts[choice]++;
    view.quiz = {
      index: q.index,
      total: q.questions.length,
      question: question.q,
      options: question.options,
      myChoice: me && me.id in q.answers ? q.answers[me.id].choice : null,
      correct: revealed ? question.answer : null,
      counts: revealed ? counts : null,
      myPoints: revealed && me ? (q.points[me.id] ?? 0) : null,
      winners: revealed
        ? Object.entries(q.points)
            .sort((a, b) => b[1] - a[1])
            .map(([id, points]) => ({ name: name(s, id), avatar: s.players.find((p) => p.id === id)?.avatar ?? '', points }))
        : null,
    };
  }

  if (s.final && (phase === 'finalAnswering' || phase === 'finalVoting' || phase === 'finalResults')) {
    const f = s.final;
    const results = phase === 'finalResults';
    view.final = {
      prompt: f.prompt,
      answered: !!me && me.id in f.submitted,
      answers: f.answers.map((a, index) => ({
        index,
        text: a.text,
        mine: !!me && a.playerId === me.id,
        author: results ? name(s, a.playerId) : null,
        votes: results ? f.points[index] / FINAL_POINTS_PER_VOTE : null,
        points: results ? f.points[index] : null,
      })),
      myVotes: me && me.id in f.votes ? f.votes[me.id] : null,
      maxVotes: FINAL_VOTES_PER_PLAYER,
    };
  }

  return view;
}

const name = (s: GameState, id: string) => s.players.find((p) => p.id === id)?.name ?? '?';
