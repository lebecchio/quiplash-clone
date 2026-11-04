/** The Jim logo: a tilted speech bubble with chunky 3D lettering. */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 360 250" role="img" aria-label="Jim">
      <defs>
        <linearGradient id="logo-bubble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd400" />
          <stop offset="1" stopColor="#ffd400" />
        </linearGradient>
        <linearGradient id="logo-text" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff2e93" />
          <stop offset="1" stopColor="#ff2e93" />
        </linearGradient>
      </defs>
      <g transform="rotate(-6 180 120)">
        <path
          id="logo-shape"
          d="M60 28 H300 a44 44 0 0 1 44 44 V132 a44 44 0 0 1 -44 44 H214 L168 222 L172 176 H60 a44 44 0 0 1 -44 -44 V72 a44 44 0 0 1 44 -44 Z"
          fill="#14110f"
          transform="translate(8 12)"
        />
        <path
          d="M60 28 H300 a44 44 0 0 1 44 44 V132 a44 44 0 0 1 -44 44 H214 L168 222 L172 176 H60 a44 44 0 0 1 -44 -44 V72 a44 44 0 0 1 44 -44 Z"
          fill="url(#logo-bubble)"
          stroke="#14110f"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path d="M44 62 q10 -14 32 -14" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
        <g fontFamily="'Bungee', 'Fredoka', sans-serif" fontSize="116" textAnchor="middle" letterSpacing="2">
          <text x="180" y="150" fill="#14110f" stroke="#14110f" strokeWidth="14" strokeLinejoin="round" transform="translate(0 8)">
            Jim
          </text>
          <text x="180" y="150" fill="url(#logo-text)" stroke="#14110f" strokeWidth="6" strokeLinejoin="round" paintOrder="stroke">
            Jim
          </text>
        </g>
        <g fill="#ff2e93" stroke="#14110f" strokeWidth="3" strokeLinejoin="round">
          <path className="spark s1" d="M322 18 l5 14 14 5 -14 5 -5 14 -5 -14 -14 -5 14 -5 Z" />
          <path className="spark s2" d="M20 168 l3.5 9 9 3.5 -9 3.5 -3.5 9 -3.5 -9 -9 -3.5 9 -3.5 Z" />
        </g>
      </g>
    </svg>
  );
}
