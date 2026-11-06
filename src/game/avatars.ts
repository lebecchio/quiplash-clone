export type ThemeId = 'default' | 'lars' | 'da';

export const isThemeId = (x: unknown): x is ThemeId => x === 'default' || x === 'lars' || x === 'da';

/** Avatar choices per theme. Each list has 16 so the picker grid stays even. */
export const AVATAR_SETS: Record<ThemeId, readonly string[]> = {
  default: ['😎', '🦄', '🐙', '🦖', '🐸', '🦊', '🐼', '🐧', '🦩', '🐝', '🌵', '🍕', '👻', '🤖', '🥑', '🐢'],
  da: ['😎', '🦄', '🐙', '🦖', '🐸', '🦊', '🐼', '🐧', '🦩', '🐝', '🌵', '🍕', '👻', '🤖', '🥑', '🐢'],
  lars: ['🍺', '🍻', '🥃', '🚬', '🎰', '🎲', '🃏', '💰', '🍀', '👴', '🥸', '👓', '🎩', '🪙', '♠️', '🧓'],
};

export const avatarsFor = (theme: ThemeId): readonly string[] => AVATAR_SETS[theme];
