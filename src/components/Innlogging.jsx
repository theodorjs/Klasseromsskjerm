import { useEffect, useState, useSyncExternalStore } from 'react';
import { aktivSkole } from '../data/skoletema.js';
import {
  skoleTjeneste,
  innloggingsadresse,
  sjekkInnlogging,
  varInnlogget,
  lyttTilTjeneste,
  lesTjenesteTilstand,
} from '../utils/ksTjeneste.js';

/**
 * Innlogging med Feide på skolens egen adresse (bare der skolen har en tjeneste).
 * Første gang i en nettleser må en ansatt logge inn før skjermen kan brukes.
 * Etterpå tegnes appen med en gang, og innloggingen sjekkes i bakgrunnen.
 * Svarer ikke tjenesten, virker Klasseskjerm som før.
 */
export default function Innlogging({ children }) {
  const [tjeneste] = useState(() => skoleTjeneste());
  const [status, setStatus] = useState(() => (!tjeneste ? 'inne' : varInnlogget() ? 'inne' : 'sjekker'));
  const { utlogget } = useSyncExternalStore(lyttTilTjeneste, lesTjenesteTilstand);

  useEffect(() => {
    if (!tjeneste) return undefined;
    let aktiv = true;
    sjekkInnlogging(tjeneste).then(svar => {
      if (!aktiv) return;
      // «feil» stopper ingenting: da går appen videre som før
      setStatus(svar.status === 'ute' ? 'ute' : 'inne');
    });
    return () => { aktiv = false; };
  }, [tjeneste]);

  if (!tjeneste) return children;
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
        <h1 className="inn-tittel" id="inn-tittel">Logg inn for å bruke Klasseskjerm</h1>
        <p className="inn-tekst">
          Bare ansatte kan logge inn. Innloggingen huskes i denne nettleseren, så du gjør det bare én gang.
        </p>
        <a className="inn-knapp" href={innloggingsadresse(tjeneste)}>Logg inn med Feide</a>
      </section>
    </main>
  );
}
