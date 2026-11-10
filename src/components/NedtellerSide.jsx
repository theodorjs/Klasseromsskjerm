import { useEffect, useState } from 'react';
import TimerPanel from './TimerPanel.jsx';
import Stars from './Stars.jsx';
import Ikon from './Ikon.jsx';
import useRolig from '../hooks/useRolig.js';
import useFagNaa from '../hooks/useFagNaa.js';
import { applyBodyClasses, lesTema, TEMA_KEY } from '../utils/tema.js';

/** Hovedsiden, sett fra timer/. */
const HOVEDSIDE_HREF = '../';

/**
 * Nedtelleren som egen side (…/Klasseskjerm/timer/). Det er den samme
 * nedtelleren som på hovedsiden, med alt den kan, bare uten resten av
 * skjermen rundt. Tema, fagfarge og en timer som går, hentes fra det
 * hovedsiden har lagret i denne nettleseren. Det endres aldri noe i timeplanen.
 *
 * Lagt på Hjem-skjermen på iPad får siden sin egen lagring (slik iOS gjør
 * med alle Hjem-skjerm-apper): den virker fullt ut, men følger ikke tema,
 * fag og timer fra Klasseskjerm i Safari. Tilbake åpner da hovedsiden i
 * et eget Safari-vindu oppå.
 */
export default function NedtellerSide() {
  const [tema, setTema] = useState(lesTema);
  const fag = useFagNaa();
  const { synlig: knappSynlig, bareVisFoerst } = useRolig();

  useEffect(() => {
    document.body.classList.add('egen-nedteller');
    return () => document.body.classList.remove('egen-nedteller');
  }, []);

  useEffect(() => { applyBodyClasses(tema); }, [tema]);

  // Bytter læreren tema på hovedsiden, følger denne siden med
  useEffect(() => {
    function naarLagret(e) { if (e.key === null || e.key === TEMA_KEY) setTema(lesTema()); }
    window.addEventListener('storage', naarLagret);
    return () => window.removeEventListener('storage', naarLagret);
  }, []);

  return (
    <>
      <Stars />
      <a
        href={HOVEDSIDE_HREF}
        className={`k-btn k-btn--tilbake nedteller-tilbake${knappSynlig ? '' : ' er-rolig'}`}
        title="Tilbake til hele Klasseskjerm"
        aria-label="Tilbake til Klasseskjerm"
        {...bareVisFoerst()}
      >
        <Ikon navn="arrow-left" /><span className="nedteller-tilbake-tekst">Klasseskjerm</span>
      </a>
      <main className="nedteller-side" aria-label="Nedteller">
        <TimerPanel
          egenSide
          open
          onClose={() => {}}
          subjectColor={fag.color}
          subjectName={fag.name}
          lessonTitle={fag.lessonTitle}
        />
      </main>
    </>
  );
}
