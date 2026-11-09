import { useState } from 'react';
import Ikon, { FagSymbol } from './Ikon.jsx';
import { SYMBOLVALG, tilSymbolnokkel, symbolnavn } from '../ikoner/symboler.js';

/* Velg et symbol for et fag eller gjøremål. Rutenettet folder seg ut under
   feltet, aldri som et løst vindu. Uten open/onToggle styrer velgeren seg selv. */
export default function SymbolVelger({ value, onPick, open, onToggle, id, reserve = 'clipboard-list' }) {
  const [egenApen, setEgenApen] = useState(false);
  const styrt = typeof open === 'boolean';
  const apen = styrt ? open : egenApen;
  const veksle = styrt ? onToggle : () => setEgenApen(v => !v);
  const valgt = tilSymbolnokkel(value);
  const navn = symbolnavn(value);
  return (
    <div className="k-field">
      <span>Symbol</span>
      <div className="k-emoji-row">
        <span className="k-emoji-preview" aria-hidden="true"><FagSymbol verdi={value} reserve={reserve} /></span>
        <button
          type="button"
          id={id}
          className="k-btn k-btn--hjelp k-btn--liten"
          aria-expanded={apen}
          onClick={veksle}
        >
          {apen ? 'Skjul symbolene' : navn ? `Bytt symbol (${navn.toLowerCase()})` : 'Velg symbol'}
        </button>
      </div>
      {apen && (
        <div className="k-emoji-grid" role="listbox" aria-label="Symboler">
          {SYMBOLVALG.map(([nokkel, tittel]) => (
            <button
              key={nokkel}
              type="button"
              role="option"
              aria-selected={nokkel === valgt}
              aria-label={tittel}
              title={tittel}
              className={`k-emoji${nokkel === valgt ? ' is-active' : ''}`}
              onClick={() => { onPick(nokkel); if (!styrt) setEgenApen(false); }}
            ><Ikon navn={nokkel} /></button>
          ))}
        </div>
      )}
    </div>
  );
}
