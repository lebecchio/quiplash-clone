import type { ThemeId } from './avatars';

export const STATE_VERSION = 3;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_PLAYER_PROMPTS = 3;
export const MAX_ANSWER_LEN = 45;
export const MAX_NAME_LEN = 15;
export const MAX_PROMPT_LEN = 100;
export const NO_ANSWER = '[no answer]';

export const ANSWER_SECONDS = 90;
export const VOTE_SECONDS = 20;
export const FINAL_VOTE_SECONDS = 30;
export const REVEAL_SECONDS = 6;
export const SCORES_SECONDS = 10;
export const QUIZ_SECONDS = 15;
export const QUIZ_REVEAL_SECONDS = 6;
export const QUIZ_QUESTIONS_PER_BREAK = 2;
export const QUIZ_POINTS = 500;
/** Extra points for a correct answer, scaled by how much of the timer was left. */
export const QUIZ_SPEED_BONUS = 500;

export const ROUND_PRIZE = { 1: 1000, 2: 2000 } as const;
export const QUIPLASH_BONUS = { 1: 250, 2: 500 } as const;
export const FINAL_VOTES_PER_PLAYER = 3;
export const FINAL_POINTS_PER_VOTE = 200;

export type Phase =
  | 'lobby'
  | 'answering'
  | 'voting'
  | 'reveal'
  | 'roundScores'
  | 'quiz'
  | 'quizReveal'
  | 'finalAnswering'
  | 'finalVoting'
  | 'finalResults'
  | 'gameOver';

export interface Player {
  id: string;
  /** Secret: links a phone to this player. Never put it in a view. */
  token: string;
  name: string;
  avatar: string;
  connected: boolean;
  score: number;
}

export interface Matchup {
  prompt: string;
  /** Player who wrote the prompt, or null for a pack prompt. */
  authorId: string | null;
  answerers: [string, string];
  answers: [string | null, string | null];
  /** voterId -> index of the answer voted for */
  votes: Record<string, 0 | 1>;
  points: [number, number];
  quiplash: boolean;
  skipped: boolean;
}

export interface FinalAnswer {
  playerId: string;
  text: string;
}

export interface FinalState {
  prompt: string;
  submitted: Record<string, string>;
  /** Shuffled once answering ends; votes refer to indexes in this list. */
  answers: FinalAnswer[];
  /** voterId -> answer indexes */
  votes: Record<string, number[]>;
  points: number[];
}

export interface QuizQuestion {
  q: string;
  options: [string, string, string, string];
  /** Index of the correct option. */
  answer: 0 | 1 | 2 | 3;
}

export interface QuizState {
  /** This break's questions, with options already shuffled. */
  questions: QuizQuestion[];
  index: number;
  /** playerId -> their locked-in choice and when it arrived */
  answers: Record<string, { choice: number; at: number }>;
  /** playerId -> points won on the current question */
  points: Record<string, number>;
}

export interface PlayerPrompt {
  authorId: string;
  text: string;
  used: boolean;
}

export interface GameState {
  version: number;
  /** mulberry32 state. */
  seed: number;
  roomCode: string;
  theme: ThemeId;
  /** Last timestamp passed in; the state machine never reads the clock. */
  now: number;
  phase: Phase;
  /** In join order. */
  players: Player[];
  playerPrompts: PlayerPrompt[];
  pack: string[];
  pool: string[];
  round: 0 | 1 | 2 | 3;
  matchups: Matchup[];
  current: number;
  /** Players who answered two prompts in earlier rounds. */
  doublers: string[];
  final: FinalState | null;
  quiz: QuizState | null;
  quizPool: QuizQuestion[];
  deadline: number | null;
  pausedAt: number | null;
}

interface Timed {
  now: number;
}
interface From extends Timed {
  playerId: string;
}

export type Action =
  | ({ type: 'tick' } & Timed)
  | ({ type: 'newRoomCode' } & Timed)
  | ({ type: 'join'; token: string; name: string; avatar?: string } & Timed)
  | ({ type: 'reconnect' } & From)
  | ({ type: 'disconnect' } & From)
  | ({ type: 'submitPrompt'; text: string } & From)
  | ({ type: 'answer'; matchupId: number; text: string } & From)
  | ({ type: 'vote'; choice: 0 | 1 } & From)
  | ({ type: 'finalVote'; answerIds: number[] } & From)
  | ({ type: 'quizAnswer'; choice: 0 | 1 | 2 | 3 } & From)
  | ({ type: 'start' } & From)
  | ({ type: 'skipTimer' } & From)
  | ({ type: 'skipMatchup' } & From)
  | ({ type: 'endGame' } & From)
  | ({ type: 'playAgain' } & From);
