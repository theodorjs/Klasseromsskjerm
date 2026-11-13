import { useEffect, useState } from 'react';
import Ikon from './Ikon.jsx';
import { safeGetItem, safeSetItem } from '../utils/storage.js';
import { aktivSkole } from '../data/skoletema.js';

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

// Kortet monteres på nytt når læreren går inn og ut av veggskjermen.
// Et valg skal gjelde resten av økta også om lagringen er blokkert.
const okta = { lukket: false };
const skalVises = () => VIS_VED_START && !okta.lukket && !safeGetItem(SETT_KEY);
function merkLukket() {
  okta.lukket = true;
  safeSetItem(SETT_KEY, '1');
}

export default function ForsteMote({ klassenavn, skjult, onOpenPlanlegg, onOpenTimer, onOpenNote, onOpenClass }) {
  const [synlig, setSynlig] = useState(skalVises);
  const vises = synlig && !skjult;

  // Mens kortet står, er «Nedteller» et av valgene i det; den egne
  // Nedteller-knappen nede til høyre venter til kortet er borte
  useEffect(() => {
    document.body.classList.toggle('velkomst-aktiv', vises);
    return () => document.body.classList.remove('velkomst-aktiv');
  }, [vises]);

  if (!vises) return null;

  const skole = aktivSkole();

  function ferdig() {
    merkLukket();
    setSynlig(false);
  }

  function velg(handling) {
    ferdig();
    handling?.();
  }

  // Rekkefølgen er arbeidsflyten for en ny lærer: velg klassen sin først,
  // så sett opp timen, start nedtelleren eller skriv en beskjed.
  const valg = [
    { id: 'klasse', ikon: 'school', tittel: 'Velg din klasse', hint: 'Klasse og timeplan', handling: onOpenClass, hoved: true },
    { id: 'time', ikon: 'list-checks', tittel: 'Agenda for timen', hint: 'Agenda og mål på tavla', handling: onOpenPlanlegg },
    { id: 'nedteller', ikon: 'timer', tittel: 'Nedteller', hint: 'Gi elevene en frist', handling: onOpenTimer },
    { id: 'notat', ikon: 'notebook-pen', tittel: 'Notat', hint: 'Skriv en beskjed', handling: onOpenNote },
  ];

  return (
    <section className="fm-kort" aria-labelledby="fm-tittel">
      <div className="fm-topp">
        <div className="fm-topp-tekst">
          <h2 id="fm-tittel" className="fm-tittel">Velkommen til Klasseskjerm</h2>
          <p className="fm-ingress">
            Skjermen viser elevene hvilken time det er nå, hvor lenge den varer og resten av dagen.
            <span className="fm-ekstra"> Den følger klokka av seg selv.</span>
            {skole
              ? <span className="fm-klasse"> Timeplanene for alle klassene på {skole.navn} ligger klare. Velg klassen din under <strong>Klasse og timeplan</strong>.</span>
              : klassenavn ? <span className="fm-klasse"> Nå vises timeplanen for klassen <strong>«{klassenavn}»</strong>.</span> : null}
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
