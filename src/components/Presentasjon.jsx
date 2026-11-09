import { useEffect, useRef, useState } from 'react';
import Ikon, { FagSymbol } from './Ikon.jsx';
import TimeTimerDial from './TimeTimerDial.jsx';
import Timeline from './Timeline.jsx';
import useSkjermVaaken from '../hooks/useSkjermVaaken.js';
import { formatDurationSmart, getIsoWeekNumberForOslo } from '../utils/time.js';
import {
  formatExpandedActivityDisplay,
  formatExpandedActivityLabel,
  buildCurrentActivityLines,
  isClassMultiGrade,
  normalizeSubjectLabel,
  getCountdownRemainingDisplay,
} from '../utils/schedule.js';
import { normalizeHexColor } from '../utils/color.js';
import { loadTimerRun, loadTimerSettings, formatTimerReadout, TIMER_CLASSIC_RED } from '../utils/timer.js';

/** Hvor lenge «Tiden er ute» står før skiva forsvinner (som i nedtelleren). */
const FERDIG_STAAR_MS = 10 * 60 * 1000;
/** Hvor lenge Tilbake-knappen står etter siste bevegelse, og første gang. */
const STYRING_SYNLIG_MS = 2500;
const STYRING_FORSTE_MS = 4500;

/** Nedtelleren slik den er lagret nå: kjører, pause eller ferdig. Null når ingen timer går. */
function lesNedteller(naa) {
  const run = loadTimerRun();
  if (!run) return null;
  if (run.endAt !== null) {
    if (run.endAt <= naa) {
      if (naa - run.endAt > FERDIG_STAAR_MS) return null;
      return { totalMs: run.totalMs, gjenstaarMs: 0, ferdig: true, pause: false };
    }
    return { totalMs: run.totalMs, gjenstaarMs: run.endAt - naa, ferdig: false, pause: false };
  }
  const rest = Math.max(0, run.pausedRemainingMs || 0);
  return { totalMs: run.totalMs, gjenstaarMs: rest, ferdig: rest <= 0, pause: rest > 0 };
}

/** Gjøremålene i agendaen for faget som pågår (ett eller flere fag ved delte timer). */
function agendaForTimen(classData, aktivitet) {
  const agendas = classData?.agendas || {};
  return String(aktivitet || '')
    .split('/')
    .map(del => normalizeSubjectLabel(del.trim()))
    .filter(fag => fag && Array.isArray(agendas[fag]) && agendas[fag].length > 0)
    .slice(0, 2)
    .map(fag => ({ fag, punkter: agendas[fag].slice(0, 6) }));
}

/**
 * Ren visning for klassen på storskjermen: hva som skjer nå, nedtelleren og
 * dagen. Ingen verktøy. Tilbake-knappen dukker opp når musa beveger seg eller
 * noen trykker på skjermen, og forsvinner igjen av seg selv.
 */
export default function Presentasjon({
  primaryState,
  displayStates,
  currentMinutes,
  currentDay,
  currentTime,
  dateStr,
  isWeekend,
  classes,
  activeTimelineClassNames,
  tempScheduleChanges,
  realMinutes,
  isSim,
  themeMode,
  countdowns = [],
  countdownsVisible = true,
  subjectColor,
  onExit,
}) {
  const [naa, setNaa] = useState(() => Date.now());
  const [styringSynlig, setStyringSynlig] = useState(true);
  const skjulTimer = useRef(null);
  const synligRef = useRef(true);
  const ignorerKlikk = useRef(false);
  const rotRef = useRef(null);

  useSkjermVaaken(true);

  // Nedtelleren lever i sitt eget panel; her leses den bare av, fire ganger i sekundet
  useEffect(() => {
    const id = setInterval(() => setNaa(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Tilbake-knappen og musepekeren skjules når ingen rører skjermen
  useEffect(() => {
    function vis(e, ms = STYRING_SYNLIG_MS) {
      synligRef.current = true;
      setStyringSynlig(true);
      if (skjulTimer.current) clearTimeout(skjulTimer.current);
      skjulTimer.current = setTimeout(() => { synligRef.current = false; setStyringSynlig(false); }, ms);
    }
    vis(null, STYRING_FORSTE_MS);
    window.addEventListener('pointermove', vis);
    window.addEventListener('pointerdown', vis);
    window.addEventListener('keydown', vis);
    return () => {
      window.removeEventListener('pointermove', vis);
      window.removeEventListener('pointerdown', vis);
      window.removeEventListener('keydown', vis);
      if (skjulTimer.current) clearTimeout(skjulTimer.current);
    };
  }, []);

  // Fokus inn i visningen, så mellomrom og Enter ikke trykker på skjulte knapper under
  useEffect(() => {
    rotRef.current?.focus({ preventScroll: true });
  }, []);

  const ukenr = getIsoWeekNumberForOslo(new Date());

  // ── Timen ──
  let etikett = '';
  let aktivitet = null;
  let linjer = null;
  let gjenstaarTekst = '';
  let nesteTekst = '';
  let agenda = [];

  if (primaryState) {
    const { schoolDayEnd, firstClassTime, currentActivity, activeEvent, normalizedDayEvents, classData } = primaryState;
    if (isWeekend) {
      aktivitet = 'Endelig helg!';
    } else if (currentMinutes >= schoolDayEnd) {
      aktivitet = currentDay === 'Fredag' ? 'Endelig helg!' : 'Skoledagen er over!';
    } else if (currentMinutes < firstClassTime) {
      etikett = 'Skoledagen begynner om';
      aktivitet = formatDurationSmart(firstClassTime - currentMinutes);
    } else {
      etikett = 'Akkurat nå';
      const flere = displayStates.length > 1 || isClassMultiGrade(classData, primaryState.className);
      if (flere) {
        const l = buildCurrentActivityLines(displayStates.length > 1 ? displayStates : [primaryState]);
        if (l.length === 1) aktivitet = l[0];
        else linjer = l;
      } else {
        aktivitet = currentActivity === 'FRI' ? 'Fri' : formatExpandedActivityDisplay(currentActivity);
      }
      if (activeEvent) {
        const igjen = formatDurationSmart(Math.max(0, activeEvent.end - currentMinutes));
        if (currentActivity === 'Mat') gjenstaarTekst = `${igjen} igjen av spisetiden`;
        else if (activeEvent.type === 'break' || ['Pause', 'Storefri'].includes(currentActivity)) gjenstaarTekst = `Neste time om ${igjen}`;
        else gjenstaarTekst = `${igjen} igjen av timen`;
      }
      const neste = normalizedDayEvents.find(e => e.start > currentMinutes && e.type === 'class');
      if (neste) nesteTekst = `${formatExpandedActivityDisplay(neste.displayActivity || neste.activity)} kl. ${neste.time}`;
      agenda = agendaForTimen(classData, currentActivity);
    }
  }

  // ── Nedtelleren ──
  const nedteller = lesNedteller(naa);
  const innstillinger = loadTimerSettings();
  const skiveFarge = innstillinger.colorOverride || normalizeHexColor(subjectColor) || TIMER_CLASSIC_RED;
  const avlesning = nedteller ? formatTimerReadout(nedteller.gjenstaarMs) : '';

  const visNedtellinger = countdownsVisible && countdowns.length > 0;

  return (
    <div
      ref={rotRef}
      className={`presentasjon${nedteller ? ' har-nedteller' : ''}${styringSynlig ? '' : ' er-rolig'}`}
      id="presentasjon"
      role="region"
      aria-label="Visning for klassen"
      tabIndex={-1}
    >
      <div className="presentasjon-topp">
        <div className="presentasjon-styring">
          <button
            type="button"
            className="k-btn k-btn--tilbake presentasjon-tilbake"
            title="Tilbake til lærervisningen (Esc)"
            aria-label="Tilbake til lærervisningen"
            onPointerDown={e => {
              // Et trykk med fingeren på en skjult knapp skal bare vise den, ikke avslutte
              ignorerKlikk.current = !synligRef.current && e.pointerType === 'touch';
            }}
            onClick={() => {
              if (ignorerKlikk.current) { ignorerKlikk.current = false; return; }
              onExit();
            }}
          >
            <Ikon navn="arrow-left" /><span className="presentasjon-tilbake-tekst">Tilbake</span>
          </button>
          <span className="presentasjon-hint" aria-hidden="true">Esc</span>
        </div>
        <div className="presentasjon-dato">
          {currentDay} {dateStr} · Uke {ukenr}{isSim ? ' (simulert)' : ''}
          {visNedtellinger && (
            <span className="presentasjon-nedtellinger">
              {countdowns.map((item, i) => {
                const d = getCountdownRemainingDisplay(item.targetDate, item.targetTime);
                return <span key={item.id || i}>{item.title}: <b>{d.value}</b> {d.unit}</span>;
              })}
            </span>
          )}
        </div>
        <div className="presentasjon-klokke" aria-live="off">{currentTime}</div>
      </div>

      <div className="presentasjon-hoved">
        <section className="presentasjon-time" aria-label="Timen">
          {etikett && <div className="presentasjon-etikett">{etikett}</div>}
          {linjer
            ? <div className="presentasjon-fag er-flere">{linjer.map((l, i) => <div key={i}>{l}</div>)}</div>
            : <div className="presentasjon-fag">{aktivitet}</div>}
          {gjenstaarTekst && <div className="presentasjon-igjen">{gjenstaarTekst}</div>}
          {agenda.length > 0 && (
            <div className="presentasjon-agenda">
              {agenda.map(({ fag, punkter }) => (
                <ul key={fag} aria-label={`Agenda: ${formatExpandedActivityLabel(fag)}`}>
                  {agenda.length > 1 && <li className="presentasjon-agenda-fag">{formatExpandedActivityLabel(fag)}</li>}
                  {punkter.map((p, i) => (
                    <li key={i} className={p.completed ? 'er-gjort' : ''}>
                      <span className="presentasjon-agenda-symbol"><FagSymbol verdi={p.emoji} reserve="clipboard-list" /></span>
                      <span className="presentasjon-agenda-navn">{p.name}</span>
                      {p.completed && <Ikon navn="check" className="presentasjon-agenda-hake" tittel="Gjort" />}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          )}
          {nesteTekst && <div className="presentasjon-neste"><span>Neste:</span> {nesteTekst}</div>}
        </section>

        {nedteller && (
          <section className={`presentasjon-nedteller${nedteller.ferdig ? ' er-ferdig' : ''}`} aria-label="Nedteller">
            <TimeTimerDial
              totalMs={nedteller.totalMs}
              remainingMs={nedteller.gjenstaarMs}
              mode={innstillinger.mode}
              color={skiveFarge}
              done={nedteller.ferdig}
              title={nedteller.ferdig ? 'Tiden er ute' : `Nedteller, ${avlesning} igjen`}
            />
            <div className="presentasjon-avlesning">
              {nedteller.ferdig ? 'Tiden er ute!' : avlesning}
            </div>
            {nedteller.pause && <div className="presentasjon-status">Pause</div>}
          </section>
        )}
      </div>

      <Timeline
        classes={classes}
        currentDay={currentDay}
        currentMinutes={currentMinutes}
        useRealTime={!isSim}
        realMinutes={realMinutes}
        activeTimelineClassNames={activeTimelineClassNames}
        tempScheduleChanges={tempScheduleChanges}
        editPermission={false}
        themeMode={themeMode}
        onOpenEditModal={() => {}}
      />
    </div>
  );
}
