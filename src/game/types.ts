export const STATE_VERSION = 1;

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
  | 'finalAnswering'
  | 'finalVoting'
  | 'finalResults'
  | 'gameOver';

export interface Player {
  id: string;
  /** Secret: links a phone to this player. Never put it in a view. */
  token: string;
  name: string;
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
  | ({ type: 'join'; token: string; name: string } & Timed)
  | ({ type: 'reconnect' } & From)
  | ({ type: 'disconnect' } & From)
  | ({ type: 'submitPrompt'; text: string } & From)
  | ({ type: 'answer'; matchupId: number; text: string } & From)
  | ({ type: 'vote'; choice: 0 | 1 } & From)
  | ({ type: 'finalVote'; answerIds: number[] } & From)
  | ({ type: 'start' } & From)
  | ({ type: 'skipTimer' } & From)
  | ({ type: 'skipMatchup' } & From)
  | ({ type: 'endGame' } & From)
  | ({ type: 'playAgain' } & From);
