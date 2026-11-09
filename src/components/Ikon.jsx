import { createElement } from 'react';
import { TEGNINGER } from '../ikoner/tegninger.js';
import { tilSymbolnokkel } from '../ikoner/symboler.js';

/* Ikon: en strektegning fra src/ikoner/tegninger.js i tekstfargen.
   Størrelsen følger skriften (1em) med mindre størrelse er satt.
   Uten tittel er ikonet pynt og skjules for skjermlesere. */
export default function Ikon({ navn, storrelse, tittel, className = '', strek = 2, style }) {
  const tegning = TEGNINGER[navn];
  if (!tegning) return null;
  const s = storrelse ?? '1em';
  return (
    <svg
      className={`ikon ${className}`.trim()}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strek}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={tittel ? 'img' : undefined}
      aria-label={tittel || undefined}
      aria-hidden={tittel ? undefined : 'true'}
      style={style}
    >
      {tegning.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

/* Symbol for et fag eller gjøremål. Tar både nye nøkler og gamle emoji.
   En emoji uten ikon vises som tekst, så ingenting forsvinner. */
export function FagSymbol({ verdi, reserve = null, storrelse, className = '' }) {
  const nokkel = tilSymbolnokkel(verdi);
  if (nokkel) return <Ikon navn={nokkel} storrelse={storrelse} className={`symbol ${className}`.trim()} />;
  if (verdi) return <span className={`symbol symbol-tekst ${className}`.trim()} aria-hidden="true">{verdi}</span>;
  return reserve ? <Ikon navn={reserve} storrelse={storrelse} className={`symbol ${className}`.trim()} /> : null;
}
