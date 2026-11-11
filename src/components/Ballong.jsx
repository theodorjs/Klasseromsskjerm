/* Bursdagsballongen: en tegnet ballong (ikke emoji) i en av fem festfarger.
   Fargen følger navnet, så samme elev får samme ballong hele dagen.
   Med `sprekker` smeller den: ballongen svulmer, sprekker i biter i sin
   egen farge med et lysglimt, og snora faller ned (se del-bursdag.css). */

const FARGER = [
  { kropp: '#E53950', skygge: '#B3243A' },
  { kropp: '#F59E0B', skygge: '#C27606' },
  { kropp: '#2F80ED', skygge: '#1F5DB5' },
  { kropp: '#8E44C9', skygge: '#6A2E9A' },
  { kropp: '#16A37A', skygge: '#0F7A5B' },
];

function ballongFarge(navn) {
  let h = 0;
  for (const tegn of String(navn)) h = (h * 31 + tegn.codePointAt(0)) >>> 0;
  return FARGER[h % FARGER.length];
}

// Bitene etter smellet: retning (grader), hvor langt de flyr og hvor mye de snurrer.
// Faste verdier, så smellet ser likt ut hver gang og ingenting trengs å regnes ut.
const BITER = [
  { v: -90, l: 52, r: 140, d: 'M0 -6 L7 4 L-6 5 Z' },
  { v: -50, l: 58, r: -200, d: 'M-6 -4 L6 -5 L4 5 L-4 4 Z' },
  { v: -10, l: 56, r: 260, d: 'M-4 -6 L6 0 L-4 6 Z' },
  { v: 30, l: 50, r: -150, d: 'M-6 -2 L4 -6 L6 4 Z' },
  { v: 75, l: 44, r: 180, d: 'M-4 -4 L6 -4 L0 6 Z' },
  { v: 120, l: 46, r: -240, d: 'M-6 0 L2 -6 L6 6 Z' },
  { v: 160, l: 56, r: 210, d: 'M-6 -6 L6 -2 L-2 6 Z' },
  { v: 200, l: 58, r: -170, d: 'M-4 -6 L4 -4 L6 4 L-6 4 Z' },
  { v: 240, l: 52, r: 230, d: 'M0 -6 L6 6 L-6 2 Z' },
  { v: -130, l: 40, r: 120, d: 'M-3 -3 L3 -3 L3 3 L-3 3 Z' },
  { v: 100, l: 34, r: -90, d: 'M-3 -3 L3 -3 L3 3 L-3 3 Z' },
  { v: 10, l: 30, r: 160, d: 'M-3 -3 L3 -3 L3 3 L-3 3 Z' },
];
const RAD = Math.PI / 180;

export default function Ballong({ navn, className = '', sprekker = false }) {
  const { kropp, skygge } = ballongFarge(navn);
  return (
    <svg
      className={`ballong ${sprekker ? 'ballong--sprekker ' : ''}${className}`.trim()}
      viewBox="0 0 40 64"
      aria-hidden="true"
      focusable="false"
    >
      <path className="ballong-snor" d="M20 44 C 16 50, 24 54, 19 59 S 21 63, 20 64" fill="none" strokeWidth="1.4" strokeLinecap="round" />
      <g className="ballong-kropp">
        <path d="M20 2 C 31 2 37 11 37 20 C 37 32 27 41 20 43 C 13 41 3 32 3 20 C 3 11 9 2 20 2 Z" fill={kropp} />
        <path d="M20 43 C 27 41 37 32 37 20 C 37 30 29 38 20 40 Z" fill={skygge} opacity="0.55" />
        <path d="M16.5 47 L 20 42.5 L 23.5 47 Z" fill={skygge} />
        <ellipse cx="12.5" cy="13" rx="3.4" ry="6" transform="rotate(24 12.5 13)" fill="#FFFFFF" opacity="0.55" />
      </g>
      {sprekker && (
        <g className="ballong-smell">
          <path
            className="ballong-glimt"
            d="M20 0 L24 15 L39 10 L28 22 L39 34 L24 29 L20 44 L16 29 L1 34 L12 22 L1 10 L16 15 Z"
            fill="#FFD84D"
          />
          {BITER.map((b, i) => (
            <path
              key={i}
              className="ballong-bit"
              d={b.d}
              fill={i % 3 === 2 ? skygge : kropp}
              style={{
                '--dx': `${(Math.cos(b.v * RAD) * b.l).toFixed(1)}px`,
                '--dy': `${(Math.sin(b.v * RAD) * b.l).toFixed(1)}px`,
                '--rot': `${b.r}deg`,
              }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
