import type { ThemeId } from './avatars';
import defaultPack from './prompts/default.json';
import larsPack from './prompts/lars.json';
import defaultQuiz from './quiz/default.json';
import larsQuiz from './quiz/lars.json';
import type { QuizQuestion } from './types';

const PACKS: Record<ThemeId, string[]> = { default: defaultPack, lars: larsPack };

const NO_ANSWER: Record<ThemeId, string> = { default: '[no answer]', lars: '[intet svar]' };

/** Whether players may write their own prompts in the lobby. */
const PLAYER_PROMPTS: Record<ThemeId, boolean> = { default: true, lars: false };

export const allowsPlayerPrompts = (theme: ThemeId): boolean => PLAYER_PROMPTS[theme];
export const packFor = (theme: ThemeId): string[] => PACKS[theme];
export const noAnswerFor = (theme: ThemeId): string => NO_ANSWER[theme];

/** Questions as authored: the options are shuffled when a question is drawn. */
const QUIZZES: Record<ThemeId, QuizQuestion[]> = { default: defaultQuiz as QuizQuestion[], lars: larsQuiz as QuizQuestion[] };
export const quizFor = (theme: ThemeId): QuizQuestion[] => QUIZZES[theme];
