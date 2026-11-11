import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { aktivSkole } from '../data/skoletema.js';
import { skoleFerier } from '../data/skoler/index.js';
import { bursdagsoversikt, datoTekst, lagErFridag, osloIDag } from '../utils/bursdager.js';
import {
  skoleTjeneste,
  hentBursdager,
  lyttTilTjeneste,
  lesTjenesteTilstand,
  startTjenesteTilstand,
} from '../utils/ksTjeneste.js';
import Ballong from './Ballong.jsx';
import Ikon from './Ikon.jsx';

function nar(dagerTil, bursdag) {
  if (dagerTil === 0) return 'I dag';
  if (dagerTil === 1) return 'I morgen';
  if (dagerTil === -1) return `Var i går, ${datoTekst(bursdag)}`;
  if (dagerTil < 0) return `Var ${datoTekst(bursdag)}`;
  return `Om ${dagerTil} dager · ${datoTekst(bursdag)}`;
}

function visesTekst(visesPaa, idag) {
  const dager = visesPaa.map(n => (n === idag ? 'i dag' : datoTekst(n)));
  return `Ballongen vises ${dager.join(' og ')}`;
}

/**
 * Lærerens oversikt over bursdagene i klassen, under «Klasse og timeplan».
 * Viser når ballongen kommer (også for bursdager i helg og ferie) og lar
 * læreren hente lista på nytt fra skolens tjeneste.
 */
export default function Bursdagsliste({ klassenavn, onBack }) {
  const [tjeneste] = useState(() => skoleTjeneste());
  const { bursdager } = useSyncExternalStore(lyttTilTjeneste, lesTjenesteTilstand);
  const [henter, setHenter] = useState(false);
  const [melding, setMelding] = useState(null); // { tekst, feil }

  useEffect(() => { startTjenesteTilstand(); }, []);

  const idag = osloIDag();
  const erFridag = useMemo(() => lagErFridag(skoleFerier(aktivSkole()?.id)), []);
  const elever = bursdager?.data?.klasser?.[klassenavn];
  const liste = useMemo(() => bursdagsoversikt(elever, idag, erFridag), [elever, idag, erFridag]);

  const hentet = bursdager?.hentet
    ? new Date(bursdager.hentet).toLocaleString('no-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
    : null;

  async function hentNaa() {
    if (!tjeneste) return;
    setHenter(true);
    setMelding(null);
    const ok = await hentBursdager(tjeneste);
    setHenter(false);
    setMelding(ok
      ? { tekst: 'Bursdagene er oppdatert.', feil: false }
      : { tekst: 'Fikk ikke hentet bursdagene nå. Den lagrede lista brukes.', feil: true });
  }

  return (
    <div className="klasse-meny bursdagsliste">
      <h1 className="class-tool-title bl-tittel">
        <Ballong navn={klassenavn} className="bl-tittel-ballong" />
        Bursdager i {klassenavn}
      </h1>
      <p className="klasse-laas">
        Ballongen vises på bursdagen. Er bursdagen i en helg eller ferie, vises den siste skoledag før og første skoledag etter.
      </p>

      <section className="k-group bl-gruppe" aria-label={`Bursdager i ${klassenavn}`}>
        {!bursdager ? (
          <p className="bl-tom">Bursdagene er ikke hentet ennå. Trykk «Hent bursdagene på nytt».</p>
        ) : !elever ? (
          <p className="bl-tom">Fant ingen klasse som heter «{klassenavn}» i skolens oversikt.</p>
        ) : liste.length === 0 ? (
          <p className="bl-tom">Ingen bursdager er registrert for {klassenavn}.</p>
        ) : (
          <ol className="bl-liste">
            {liste.map(b => (
              <li key={`${b.fornavn}:${b.bursdag}`} className={`bl-rad${b.dagerTil === 0 || b.visesPaa.includes(idag) ? ' er-i-dag' : ''}`}>
                <Ballong navn={b.fornavn} className="bl-ballong" />
                <span className="bl-tekst">
                  <span className="bl-navn">{b.fornavn}</span>
                  <span className="bl-nar">{nar(b.dagerTil, b.bursdag)}</span>
                  {b.visesPaa.length > 0 && <span className="bl-vises">{visesTekst(b.visesPaa, idag)}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="k-group bl-gruppe bl-hent" aria-label="Hent bursdagene">
        <p className="bl-hentet">
          {hentet ? `Lista ble sist hentet ${hentet}.` : 'Lista er ikke hentet ennå.'} Bursdagene kommer fra skolens oversikt, bare fornavn og dato.
        </p>
        <button type="button" className="k-btn k-btn--bursdag" onClick={hentNaa} disabled={henter || !tjeneste}>
          <Ikon navn="refresh-cw" /> {henter ? 'Henter …' : 'Hent bursdagene på nytt'}
        </button>
        {melding && <p className={`class-tool-msg${melding.feil ? ' is-error' : ''}`} role="status">{melding.tekst}</p>}
      </section>

      <button type="button" className="k-btn k-btn--tilbake" onClick={onBack}><Ikon navn="arrow-left" /> Tilbake</button>
    </div>
  );
}
