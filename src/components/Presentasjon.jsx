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
import { readTimerStatus, loadTimerSettings, formatTimerReadout, TIMER_CLASSIC_RED } from '../utils/timer.js';
import { timeStatus } from '../hooks/useDagensTime.js';

/** Hvor lenge Tilbake-knappen står etter siste bevegelse, og første gang. */
const STYRING_SYNLIG_MS = 2500;
const STYRING_FORSTE_MS = 4500;

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
  dagensTime = null,
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

  // ── Timen læreren har satt opp («Sett opp timen») ──
  const time = dagensTime ? timeStatus(dagensTime, currentMinutes) : null;
  const timeTittel = dagensTime ? (dagensTime.tittel || (etikett === 'Akkurat nå' ? aktivitet : '') || '') : '';

  // ── Nedtelleren ──
  const timer = readTimerStatus(naa);
  const nedteller = timer && { totalMs: timer.totalMs, gjenstaarMs: timer.remainingMs, ferdig: timer.done, pause: timer.paused };
  const innstillinger = loadTimerSettings();
  const oppgave = nedteller ? innstillinger.task : '';
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
          <span className="presentasjon-dato-linje">{currentDay} {dateStr} · Uke {ukenr}{isSim ? ' (simulert)' : ''}</span>
          {visNedtellinger && (
            <span className="presentasjon-nedtellinger">
              {countdowns.map((item, i) => {
                const d = getCountdownRemainingDisplay(item.targetDate, item.targetTime);
                return <span key={item.id || i}>{item.title}: <b>{d.value}</b> {String(d.unit || '').toLowerCase()}</span>;
              })}
            </span>
          )}
        </div>
        <div className="presentasjon-klokke" aria-live="off">{currentTime}</div>
      </div>

      <div className="presentasjon-hoved">
        <section className={`presentasjon-time${dagensTime ? ' har-time' : ''}`} aria-label="Timen">
          {dagensTime ? (
            <>
              <div className="presentasjon-etikett">{dagensTime.fra}–{dagensTime.til}</div>
              {timeTittel && <div className="presentasjon-fag er-tittel">{timeTittel}</div>}
              {time.status && <div className="presentasjon-igjen">{time.status}</div>}
              {dagensTime.maal && (
                <div className="presentasjon-maal">
                  <span className="presentasjon-maal-merke"><Ikon navn="target" /> Mål</span>
                  <span className="presentasjon-maal-tekst">{dagensTime.maal}</span>
                </div>
              )}
              {dagensTime.punkter.length > 0 && (
                <ol className={`presentasjon-punkter${dagensTime.punkter.length > 4 ? ' er-mange' : ''}`} aria-label="Agenda">
                  {dagensTime.punkter.map((p, i) => (
                    <li key={i} className={`${p.ferdig ? 'er-ferdig' : ''}${i === time.naaIndex ? ' er-naa' : ''}`.trim() || undefined}>
                      <span className="dt-nr">{p.ferdig ? <Ikon navn="check" strek={3} tittel="Gjort" /> : i + 1}</span>
                      <span className="presentasjon-punkt-tekst">{p.tekst}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
          {nesteTekst && !(dagensTime && dagensTime.punkter.length > 2) && <div className="presentasjon-neste"><span>Neste:</span> {nesteTekst}</div>}
        </section>

        {nedteller && (
          <section className={`presentasjon-nedteller${nedteller.ferdig ? ' er-ferdig' : ''}`} aria-label="Nedteller">
            {oppgave && <div className="presentasjon-oppgave">{oppgave}</div>}
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
