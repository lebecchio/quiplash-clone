export type ThemeId = 'default' | 'lars';

export const isThemeId = (x: unknown): x is ThemeId => x === 'default' || x === 'lars';

/** Avatar choices per theme. Each list has 16 so the picker grid stays even. */
export const AVATAR_SETS: Record<ThemeId, readonly string[]> = {
  default: ['😎', '🦄', '🐙', '🦖', '🐸', '🦊', '🐼', '🐧', '🦩', '🐝', '🌵', '🍕', '👻', '🤖', '🥑', '🐢'],
  lars: ['🍺', '🍻', '🥃', '🚬', '🎰', '🎲', '🃏', '💰', '🍀', '👴', '🥸', '👓', '🎩', '🪙', '♠️', '🧓'],
};

export const avatarsFor = (theme: ThemeId): readonly string[] => AVATAR_SETS[theme];
