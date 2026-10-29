import type { ThemeId } from './game/avatars';

export interface ThemeInfo {
  title: string;
  /** Shown next to the title. */
  emoji: string;
  /** Paths under public/, shown in a carousel on the host screen. */
  photos: string[];
  /** Path under public/ of a lobby song. Without one, the synthesized loop plays. */
  music?: string;
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  default: { title: 'Jim', emoji: '', photos: [] },
  lars: {
    title: 'Gamle Lars spillet',
    emoji: '🍀',
    photos: Array.from({ length: 10 }, (_, i) => `lars/photo-${i + 1}.jpg`),
    music: 'lars/lobby.mp3',
  },
};

/** Colors and decorations live in styles.css under html[data-theme="..."]. */
export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}
