import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Dialog from './Dialog.jsx';
import { aktivSkole } from '../data/skoletema.js';
import {
  skoleTjeneste,
  utloggingsadresse,
  innloggingsadresse,
  forlatElev,
  hentBursdager,
  glemLokalt,
  lyttTilTjeneste,
  lesTjenesteTilstand,
} from '../utils/ksTjeneste.js';

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
      <SkoleTjeneste />
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

/** Innlogget ansatt og bursdagslista (eller elevmodus), bare på skolens egen adresse. */
function SkoleTjeneste() {
  const [tjeneste] = useState(() => skoleTjeneste());
  const { navn, bursdager, elev } = useSyncExternalStore(lyttTilTjeneste, lesTjenesteTilstand);
  const [henter, setHenter] = useState(false);
  const [melding, setMelding] = useState('');
  if (!tjeneste) return null;

  if (elev) {
    return (
      <div className="om-tjeneste">
        <p className="k-dialog-tekst">Du bruker Klasseskjerm som elev, uten innlogging.</p>
        <div className="om-tjeneste-knapper">
          <button
            type="button"
            className="k-btn k-btn--tilbake k-btn--liten"
            onClick={() => { forlatElev(); window.location.assign(innloggingsadresse(tjeneste)); }}
          >
            Logg inn som lærer
          </button>
        </div>
      </div>
    );
  }

  const hentet = bursdager?.hentet
    ? new Date(bursdager.hentet).toLocaleString('no-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
    : null;

  async function hentNaa() {
    setHenter(true);
    setMelding('');
    const ok = await hentBursdager(tjeneste);
    setHenter(false);
    setMelding(ok ? 'Bursdagene er oppdatert.' : 'Fikk ikke hentet bursdagene nå. Den lagrede lista brukes.');
  }

  function loggUt() {
    glemLokalt();
    window.location.assign(utloggingsadresse(tjeneste));
  }

  return (
    <div className="om-tjeneste">
      <p className="k-dialog-tekst">
        {navn ? <>Innlogget som <strong>{navn}</strong>.</> : 'Innlogget med Feide.'}{' '}
        {hentet ? `Bursdagene ble sist hentet ${hentet}.` : 'Bursdagene er ikke hentet ennå.'}
      </p>
      {melding && <p className="k-dialog-tekst is-dempet" role="status">{melding}</p>}
      <div className="om-tjeneste-knapper">
        <button type="button" className="k-btn k-btn--tilbake k-btn--liten" onClick={hentNaa} disabled={henter}>
          {henter ? 'Henter …' : 'Hent bursdagene på nytt'}
        </button>
        <button type="button" className="k-btn k-btn--tilbake k-btn--liten" onClick={loggUt}>Logg ut</button>
      </div>
    </div>
  );
}
