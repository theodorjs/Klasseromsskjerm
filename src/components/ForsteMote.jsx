import { useState } from 'react';
import Ikon from './Ikon.jsx';
import { safeGetItem, safeSetItem } from '../utils/storage.js';
import { vekslFullskjerm } from '../utils/fullskjerm.js';

/* Første møte: en ny lærer som åpner appen for første gang skal på
   noen sekunder skjønne hva skjermen er og hva første steg er.
   Kortet ligger på hovedskjermen uten å sperre den: timeplanen går
   videre bak, og elevene ser fortsatt timen som pågår. */

const SETT_KEY = 'klasseskjerm.velkomstSett';

// Lest én gang før appen selv rekker å lagre noe: har nettleseren
// spor av tidligere bruk, er dette ikke et første besøk.
const SPOR_AV_BRUK = ['klasseromData', 'preferredMode', 'currentClassName', 'timerInnstillinger', 'timerKjoring'];
const VIS_VED_START = (() => {
  if (safeGetItem(SETT_KEY)) return false;
  return !SPOR_AV_BRUK.some(key => safeGetItem(key));
})();

export default function ForsteMote({ klassenavn, skjult, onOpenTimer, onOpenAgenda, onOpenNote, onOpenClass }) {
  const [synlig, setSynlig] = useState(VIS_VED_START);

  if (!synlig || skjult) return null;

  function ferdig() {
    safeSetItem(SETT_KEY, '1');
    setSynlig(false);
  }

  function velg(handling) {
    ferdig();
    handling?.();
  }

  const valg = [
    { id: 'nedteller', ikon: 'timer', tittel: 'Nedteller', hint: 'Gi elevene en frist', handling: onOpenTimer, hoved: true },
    { id: 'agenda', ikon: 'list-checks', tittel: 'Agenda', hint: 'Planen for timen', handling: onOpenAgenda },
    { id: 'notat', ikon: 'notebook-pen', tittel: 'Notat', hint: 'Skriv en beskjed', handling: onOpenNote },
    { id: 'fullskjerm', ikon: 'maximize', tittel: 'Fullskjerm', hint: 'Fyll storskjermen', handling: vekslFullskjerm },
    { id: 'klasse', ikon: 'school', tittel: 'Klasse og timeplan', hint: 'Velg din klasse', handling: onOpenClass },
  ];

  return (
    <section className="fm-kort" aria-labelledby="fm-tittel">
      <div className="fm-topp">
        <div className="fm-topp-tekst">
          <h2 id="fm-tittel" className="fm-tittel">Velkommen til Klasseskjerm</h2>
          <p className="fm-ingress">
            Skjermen viser elevene hvilken time det er nå, hvor lenge den varer og resten av dagen.
            <span className="fm-ekstra"> Den følger klokka av seg selv.</span>
            {klassenavn ? <span className="fm-klasse"> Nå vises timeplanen for klassen <strong>«{klassenavn}»</strong>.</span> : null}
          </p>
        </div>
        <button type="button" className="k-btn k-btn--tilbake k-btn--liten fm-skjul" id="fm-skjul" onClick={ferdig}>
          Skjul velkomsten
        </button>
      </div>

      <div className="fm-rad">
        <p className="fm-sporsmal" id="fm-sporsmal">Hva vil du gjøre først?</p>
        <p className="fm-hjelp">
          Alt finnes også under
          <span className="fm-merke"><Ikon navn="verktoykasse" /> Verktøy</span>
          øverst til venstre.
        </p>
      </div>
      <div className="fm-valg" role="group" aria-labelledby="fm-sporsmal">
        {valg.map(v => (
          <button
            key={v.id}
            type="button"
            id={`fm-${v.id}`}
            className={`fm-knapp${v.hoved ? ' fm-knapp--hoved' : ''}`}
            onClick={() => velg(v.handling)}
          >
            <span className="fm-knapp-ikon" aria-hidden="true"><Ikon navn={v.ikon} /></span>
            <span className="fm-knapp-tekst">
              <span className="fm-knapp-tittel">{v.tittel}</span>
              <span className="fm-knapp-hint">{v.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
