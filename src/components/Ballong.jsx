/* Bursdagsballongen: en tegnet ballong (ikke emoji) i en av fem festfarger.
   Fargen følger navnet, så samme elev får samme ballong hele dagen. */

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

export default function Ballong({ navn, className = '' }) {
  const { kropp, skygge } = ballongFarge(navn);
  return (
    <svg className={`ballong ${className}`.trim()} viewBox="0 0 40 64" aria-hidden="true" focusable="false">
      <path className="ballong-snor" d="M20 44 C 16 50, 24 54, 19 59 S 21 63, 20 64" fill="none" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M20 2 C 31 2 37 11 37 20 C 37 32 27 41 20 43 C 13 41 3 32 3 20 C 3 11 9 2 20 2 Z" fill={kropp} />
      <path d="M20 43 C 27 41 37 32 37 20 C 37 30 29 38 20 40 Z" fill={skygge} opacity="0.55" />
      <path d="M16.5 47 L 20 42.5 L 23.5 47 Z" fill={skygge} />
      <ellipse cx="12.5" cy="13" rx="3.4" ry="6" transform="rotate(24 12.5 13)" fill="#FFFFFF" opacity="0.55" />
    </svg>
  );
}
