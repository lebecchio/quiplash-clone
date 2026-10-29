import type { ThemeId } from './game/avatars';

export interface ThemeInfo {
  title: string;
  /** Shown next to the title. */
  emoji: string;
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  default: { title: 'Quiplash Clone', emoji: '' },
  lars: { title: "Lars' Quiplash", emoji: '🍀' },
};

/** Colors and decorations live in styles.css under html[data-theme="..."]. */
export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}
