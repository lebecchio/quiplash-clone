const BLOBS = [
  { left: '8%', size: '34vmax', duration: '26s', delay: '0s', color: 'var(--pink)' },
  { left: '30%', size: '26vmax', duration: '32s', delay: '-9s', color: 'var(--orange)' },
  { left: '52%', size: '38vmax', duration: '38s', delay: '-18s', color: 'var(--violet)' },
  { left: '72%', size: '28vmax', duration: '29s', delay: '-4s', color: 'var(--pink)' },
  { left: '88%', size: '32vmax', duration: '35s', delay: '-23s', color: 'var(--mint)' },
  { left: '18%', size: '22vmax', duration: '24s', delay: '-14s', color: 'var(--violet)' },
];

/** Decorative slow-rising, morphing blobs behind the regular screens. */
export function LavaLamp() {
  return (
    <div className="lava" aria-hidden="true">
      {BLOBS.map((b, i) => (
        <span
          key={i}
          style={{ left: b.left, width: b.size, height: b.size, animationDuration: b.duration, animationDelay: b.delay, background: b.color }}
        />
      ))}
    </div>
  );
}
