import type { ThemeId } from './game/avatars';

export interface ThemeInfo {
  title: string;
  /** Shown next to the title. */
  emoji: string;
  /** Paths under public/, shown in a carousel on the host screen. */
  photos: string[];
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  default: { title: 'Quiplash Clone', emoji: '', photos: [] },
  lars: {
    title: "Lars' Quiplash",
    emoji: '🍀',
    photos: ['lars/photo-1.jpg', 'lars/photo-2.jpg', 'lars/photo-3.jpg'],
  },
};

/** Colors and decorations live in styles.css under html[data-theme="..."]. */
export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}
