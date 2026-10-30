const COLORS = ['#ff6fae', '#ffa45c', '#8a6cff', '#2fbf9b', '#ffd84a', '#ffffff'];
const PIECES = Array.from({ length: 80 }, (_, i) => ({
  left: `${(i * 29 + (i % 7) * 5) % 100}%`,
  delay: `${((i * 37) % 90) / 100}s`,
  duration: `${2.6 + ((i * 13) % 14) / 10}s`,
  size: `${8 + ((i * 11) % 9)}px`,
  color: COLORS[i % COLORS.length],
  drift: `${((i * 17) % 21) - 10}vw`,
  round: i % 3 === 0,
}));

/** A one-off burst of confetti falling over the whole screen. */
export function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left,
            width: p.size,
            height: p.round ? p.size : `calc(${p.size} * 0.45)`,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: p.delay,
            animationDuration: p.duration,
            ['--drift' as string]: p.drift,
          }}
        />
      ))}
    </div>
  );
}
