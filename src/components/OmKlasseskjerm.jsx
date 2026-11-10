import { createPortal } from 'react-dom';
import Dialog from './Dialog.jsx';
import { aktivSkole } from '../data/skoletema.js';

// Det samme som bunnteksten i de andre prosjektene (Kooperative grupper,
// Sandakers Verden, naturfag). Klasseskjerm har ingen bunntekst, fordi
// hovedskjermen allerede er full; signaturen ligger nederst i verktøymenyen.
export const OPPHAVSPERSON = 'Theodor Sandaker';
export const AAR = 2026;
export const KONTAKT_EPOST = 'sandakersverden@gmail.com';
export const SANDAKERS_VERDEN = 'https://theodorjs.github.io/sandakersverden/';

/** Den dempede linja nederst i verktøymenyen. Åpner «Om Klasseskjerm». */
export function Signatur({ onClick }) {
  return (
    <button
      type="button"
      className="toolbox-signatur"
      id="tool-om"
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseDown={e => e.stopPropagation()}
      aria-label="Om Klasseskjerm"
    >
      © {OPPHAVSPERSON} · <span className="toolbox-signatur-om">Om</span>
    </button>
  );
}

export default function OmKlasseskjerm({ onClose }) {
  const skole = aktivSkole();
  // Til <body>, så dialogen ikke arver verktøymenyens lag og bevegelse
  return createPortal(
    <Dialog onClose={onClose} title="Om Klasseskjerm" className="om-dialog">
      <p className="k-dialog-tekst">
        Klasseskjerm er laget av {OPPHAVSPERSON}.
      </p>
      {skole && (
        <p className="k-dialog-tekst">
          {skole.navn} bruker Klasseskjerm med tillatelse fra utvikleren.
        </p>
      )}
      <p className="k-dialog-tekst is-dempet om-signatur">
        © {AAR} {OPPHAVSPERSON} · Alle rettigheter forbeholdt ·{' '}
        <a href={`mailto:${KONTAKT_EPOST}`}>Kontakt</a>
        {' · '}en del av{' '}
        <a href={SANDAKERS_VERDEN} target="_blank" rel="noopener noreferrer">Sandakers Verden</a>
      </p>
      <div className="k-dialog-actions">
        <button type="button" className="k-btn k-btn--tilbake" onClick={onClose}>Lukk</button>
      </div>
    </Dialog>,
    document.body,
  );
}
