import { useEffect, useState, useSyncExternalStore } from 'react';
import { aktivSkole } from '../data/skoletema.js';
import {
  skoleTjeneste,
  innloggingsadresse,
  sjekkInnlogging,
  varInnlogget,
  erElev,
  velgElev,
  forlatElev,
  lyttTilTjeneste,
  lesTjenesteTilstand,
} from '../utils/ksTjeneste.js';

/**
 * Innlogging med Feide på skolens egen adresse (bare der skolen har en tjeneste).
 * Første gang i en nettleser må en ansatt logge inn før skjermen kan brukes.
 * Elever logger ikke inn: de trykker «Jeg er elev» og bruker skjermen uten bursdager.
 * Etterpå tegnes appen med en gang, og innloggingen sjekkes i bakgrunnen.
 * Svarer ikke tjenesten, virker Klasseskjerm som før.
 */
export default function Innlogging({ children }) {
  const [tjeneste] = useState(() => skoleTjeneste());
  const [status, setStatus] = useState(() => (!tjeneste || varInnlogget() || erElev() ? 'inne' : 'sjekker'));
  const { utlogget, elev } = useSyncExternalStore(lyttTilTjeneste, lesTjenesteTilstand);

  useEffect(() => {
    // Elevene spør aldri tjenesten
    if (!tjeneste || elev) return undefined;
    let aktiv = true;
    sjekkInnlogging(tjeneste).then(svar => {
      if (!aktiv) return;
      // «feil» stopper ingenting: da går appen videre som før
      setStatus(svar.status === 'ute' ? 'ute' : 'inne');
    });
    return () => { aktiv = false; };
  }, [tjeneste, elev]);

  if (!tjeneste || elev) return children;
  if (status === 'ute' || utlogget) return <LoggInn tjeneste={tjeneste} />;
  if (status === 'sjekker') return <div className="inn-side" aria-busy="true" />;
  return children;
}

function LoggInn({ tjeneste }) {
  const skole = aktivSkole();
  return (
    <main className="inn-side">
      <section className="inn-kort" aria-labelledby="inn-tittel">
        <p className="inn-over">{skole?.navn}</p>
        <h1 className="inn-tittel" id="inn-tittel">Velkommen til Klasseskjerm</h1>
        <div className="inn-valg">
          <div className="inn-del">
            <h2 className="inn-undertittel">Lærer</h2>
            <p className="inn-tekst">
              Logg inn med Feide. Innloggingen huskes i denne nettleseren, så du gjør det bare én gang.
            </p>
            <a className="inn-knapp" href={innloggingsadresse(tjeneste)} onClick={forlatElev}>Logg inn med Feide</a>
          </div>
          <div className="inn-del">
            <h2 className="inn-undertittel">Elev</h2>
            <p className="inn-tekst">
              Du trenger ikke logge inn. Se timeplanen for dagen din og bruk nedtelleren og de andre verktøyene.
            </p>
            <button type="button" className="inn-knapp inn-knapp--elev" onClick={velgElev}>Jeg er elev</button>
          </div>
        </div>
      </section>
    </main>
  );
}
