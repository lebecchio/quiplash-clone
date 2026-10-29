const CLOVERS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${-((i * 53) % 17)}s`,
  duration: `${12 + ((i * 7) % 9)}s`,
  size: `${1.2 + ((i * 13) % 10) / 6}rem`,
  glyph: i % 4 === 0 ? '💰' : '🍀',
}));

/** Decorative falling clovers and coins behind the Lars screens. */
export function CloverRain() {
  return (
    <div className="rain" aria-hidden="true">
      {CLOVERS.map((c, i) => (
        <span key={i} style={{ left: c.left, animationDelay: c.delay, animationDuration: c.duration, fontSize: c.size }}>
          {c.glyph}
        </span>
      ))}
    </div>
  );
}
