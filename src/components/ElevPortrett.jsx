import { useState, useRef, useEffect } from 'react';
import Ikon, { FagSymbol } from './Ikon.jsx';
import TimeTimerDial from './TimeTimerDial.jsx';
import SkiveBryter from './SkiveBryter.jsx';
import useVisSkive from '../hooks/useVisSkive.js';
import { formatDurationSmart, formatMinutesAsTime, getIsoWeekNumberForOslo } from '../utils/time.js';
import {
  getClassScheduleState,
  buildCurrentActivityLines,
  isClassMultiGrade,
  formatExpandedActivityDisplay,
  getStoredSubjectEmoji,
  getTempScheduleKey,
  normalizeSubjectLabel,
  stripGradeSuffix,
  getCountdownRemainingDisplay,
} from '../utils/schedule.js';
import { getSubjectDefaultColor, getCurrentSubjectColor, normalizeHexColor } from '../utils/color.js';
import { TIMER_CLASSIC_RED, loadTimerSettings, readTimerStatus, formatTimerReadout } from '../utils/timer.js';
import { timeStatus } from '../hooks/useDagensTime.js';

/**
 * Stående skjerm (elevenes iPad, mobil): hovedskjermen og den liggende
 * tidslinja er laget for en bred tavle. På høykant viser vi i stedet
 * «Akkurat nå» med tid igjen som skive, og dagens plan som en liste
 * med klokkeslett, der timen som pågår er markert. Etter skoletid
 * viser lista neste skoledag. Vises bare på høykant (styres i CSS).
 */

const SKOLEDAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const ALLE_DAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const DAG_MS = 24 * 60 * 60 * 1000;

/** Neste dag (etter i dag) som har timer for klassen, høyst en uke fram. */
function finnNesteSkoledag(className, currentDay, classes, tempScheduleChanges) {
  const start = ALLE_DAGER.indexOf(currentDay);
  if (start < 0) return null;
  for (let fram = 1; fram <= 7; fram++) {
    const dag = ALLE_DAGER[(start + fram) % 7];
    if (!SKOLEDAGER.includes(dag)) continue;
    const uke = getIsoWeekNumberForOslo(new Date(Date.now() + fram * DAG_MS));
    const state = getClassScheduleState(className, dag, -1, classes, tempScheduleChanges, uke);
    if (state && state.normalizedDayEvents.length > 0) return { dag, fram, state };
  }
  return null;
}

/** Linjene for én økt, med like fag slått sammen og trinnet foran. */
function linjerForOkt(state, event) {
  const activity = event.displayActivity || event.activity;
  try {
    const lines = buildCurrentActivityLines([{ ...state, currentActivity: activity, activeEvent: event }]);
    if (lines.length) return lines;
  } catch { /* faller tilbake til vanlig visning */ }
  return [formatExpandedActivityDisplay(activity)];
}

function fargerForOkt(classData, activity) {
  const subjectColors = classData?.subjectColors || {};
  return String(activity || '').split('/').map(a => {
    const trimmed = a.trim();
    if (subjectColors[trimmed]) return subjectColors[trimmed];
    const base = stripGradeSuffix(trimmed);
    if (base && subjectColors[base]) return subjectColors[base];
    return getSubjectDefaultColor(trimmed);
  }).filter(c => c && c.toLowerCase() !== '#ffffff');
}

/** Gjøremålene læreren har lagt inn for faget/fagene i økta. */
function gjoremalForOkt(classData, activity) {
  const agendas = classData?.agendas || {};
  const items = [];
  String(activity || '').split('/').forEach(part => {
    const key = normalizeSubjectLabel(part);
    const list = agendas[key] || agendas[stripGradeSuffix(key)] || [];
    list.forEach(item => { if (item && item.name) items.push(item); });
  });
  return items;
}

/** Lista ruller selv bare når dagen har mange økter; da holdes timen som pågår i syne. */
function PlanListe({ fokusIdx, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const ol = ref.current;
    if (!ol || fokusIdx < 0 || ol.scrollHeight <= ol.clientHeight) return;
    const li = ol.children[fokusIdx];
    if (!li) return;
    const boks = ol.getBoundingClientRect();
    const rad = li.getBoundingClientRect();
    if (rad.top < boks.top || rad.bottom > boks.bottom) {
      ol.scrollTop += rad.top - boks.top - 8;
    }
  }, [fokusIdx]);
  return <ol className="ep-liste" ref={ref}>{children}</ol>;
}

function Plan({ state, classes, minutter, erIDag, editPermission, onOpenEditModal, dag, tempScheduleChanges }) {
  const events = state?.normalizedDayEvents || [];
  if (!events.length) {
    return <div className="ep-tom">Ingen timer denne dagen.</div>;
  }
  const nesteIdx = erIDag ? events.findIndex(e => e.start > minutter) : -1;
  const naaIdx = erIDag ? events.findIndex(e => minutter >= e.start && minutter < e.end) : -1;

  return (
    <PlanListe fokusIdx={naaIdx >= 0 ? naaIdx : nesteIdx}>
      {events.map((event, idx) => {
        const activity = event.displayActivity || event.activity;
        const isBreak = event.type === 'break';
        const ferdig = erIDag && minutter >= event.end;
        const naa = erIDag && minutter >= event.start && minutter < event.end;
        const linjer = linjerForOkt(state, event);
        const farger = fargerForOkt(state.classData, activity);
        const hovedfarge = farger[0] || null;
        // Pauser har ingen fagfarge; da brukes TimeTimer-rødt, som på skiva
        const aksent = (!isBreak && hovedfarge) ? hovedfarge : TIMER_CLASSIC_RED;
        const symbol = getStoredSubjectEmoji(state.className, activity.split('/')[0], classes);
        const andel = naa ? Math.min(1, Math.max(0, (minutter - event.start) / Math.max(1, event.end - event.start))) : 0;
        const gjoremal = naa && !isBreak ? gjoremalForOkt(state.classData, activity) : [];

        const liKlasse = `ep-li${isBreak ? ' li-pause' : ''}${naa ? ' li-naa' : ''}`;
        const radStil = naa ? { borderColor: aksent } : undefined;
        // Pauser får bare symbolet; fag får fagfargen (to fag: overgang)
        const swatchStyle = isBreak ? undefined : (farger.length > 1
          ? { background: `linear-gradient(135deg, ${farger.join(', ')})` }
          : (hovedfarge ? { backgroundColor: hovedfarge } : undefined));

        const klasse = [
          'ep-rad',
          isBreak ? 'er-pause' : '',
          ferdig ? 'er-ferdig' : '',
          naa ? 'er-naa' : '',
          linjer.length > 1 ? 'er-delt' : '',
        ].filter(Boolean).join(' ');

        let status = null;
        if (naa) {
          status = (
            <span className="ep-status ep-status-naa" style={{ backgroundColor: aksent }}>
              Nå · {formatDurationSmart(event.end - minutter)} igjen
            </span>
          );
        } else if (ferdig) {
          status = <span className="ep-status ep-status-ferdig"><Ikon navn="check" tittel="Ferdig" /></span>;
        } else if (idx === nesteIdx) {
          status = <span className="ep-status ep-status-neste">om {formatDurationSmart(event.start - minutter)}</span>;
        }

        const innhold = (
          <>
            {naa && <span className="ep-rad-fyll" style={{ width: `${andel * 100}%`, backgroundColor: aksent }} aria-hidden="true" />}
            <span className="ep-tid">
              <span className="ep-tid-fra">{event.time}</span>
              <span className="ep-tid-til">{formatMinutesAsTime(event.end)}</span>
            </span>
            <span className={`ep-symbol${swatchStyle ? ' har-farge' : ''}`} style={swatchStyle}>
              <FagSymbol verdi={symbol} reserve={isBreak ? 'pause' : 'book-open'} />
            </span>
            <span className="ep-navn">
              {linjer.map((l, i) => <span key={i} className="ep-navn-linje">{l}</span>)}
              {gjoremal.length > 0 && (
                <span className="ep-gjoremal">
                  {gjoremal.slice(0, 4).map((g, i) => (
                    <span key={i} className={`ep-gjoremal-punkt${g.completed ? ' er-gjort' : ''}`}>
                      <Ikon navn={g.completed ? 'circle-check' : 'minus'} />
                      {g.name}{g.duration ? ` (${g.duration} min)` : ''}
                    </span>
                  ))}
                  {gjoremal.length > 4 && <span className="ep-gjoremal-punkt">+{gjoremal.length - 4} til</span>}
                </span>
              )}
            </span>
            {status}
          </>
        );

        // Læreren kan endre dagens økter herfra, som på tidslinja
        if (erIDag && editPermission && onOpenEditModal) {
          const eventKey = getTempScheduleKey(state.className, dag, event.time);
          const legacyEventKey = `${dag}-${event.time}`;
          const changes = tempScheduleChanges?.changes || {};
          const hasTempActivity = Object.prototype.hasOwnProperty.call(changes, eventKey)
            || Object.prototype.hasOwnProperty.call(changes, legacyEventKey);
          return (
            <li key={`${event.time}-${idx}`} className={liKlasse}>
              <button
                type="button"
                className={`${klasse} er-redigerbar`}
                style={radStil}
                title="Endre denne økta for i dag"
                onClick={() => onOpenEditModal({
                  eventKey,
                  legacyEventKey,
                  displayActivity: activity,
                  hasTempActivity,
                })}
              >
                {innhold}
              </button>
            </li>
          );
        }
        return (
          <li key={`${event.time}-${idx}`} className={liKlasse} aria-current={naa ? 'time' : undefined}>
            <div className={klasse} style={radStil}>{innhold}</div>
          </li>
        );
      })}
    </PlanListe>
  );
}

export default function ElevPortrett({
  primaryState,
  displayStates,
  currentMinutes,
  currentSeconds,
  currentDay,
  isWeekend,
  classes,
  currentClassName,
  tempScheduleChanges,
  editPermission,
  onOpenEditModal,
  countdowns = [],
  countdownsVisible = true,
  onEditCountdown,
  dagensTime = null,
  onOpenTimer,
}) {
  // Valgt fane gjelder bare den dagen den ble valgt
  const [valg, setValg] = useState({ dag: null, fane: null });
  // Samme valg som på hovedtavla: skiva i «Akkurat nå» kan skjules
  const [visSkive, vekslSkive] = useVisSkive();

  if (!primaryState) return null;

  const { schoolDayEnd, firstClassTime, activeEvent, normalizedDayEvents, currentActivity } = primaryState;
  const harTimerIDag = !isWeekend && normalizedDayEvents.length > 0;
  const dagenErOver = !harTimerIDag || currentMinutes >= schoolDayEnd;
  const neste = finnNesteSkoledag(currentClassName, currentDay, classes, tempScheduleChanges);

  const autoFane = dagenErOver && neste ? 'neste' : 'idag';
  const fane = (valg.dag === currentDay && valg.fane) ? valg.fane : autoFane;
  const velg = (f) => setValg({ dag: currentDay, fane: f });

  const nesteNavn = neste ? (neste.fram === 1 ? 'I morgen' : neste.dag) : '';
  const nesteForste = neste ? neste.state.normalizedDayEvents.find(e => e.type === 'class') || neste.state.normalizedDayEvents[0] : null;
  const nesteForsteTekst = nesteForste
    ? linjerForOkt(neste.state, nesteForste).join(' / ')
    : '';

  // ── «Akkurat nå»-kortet ──
  let etikett = '';
  let hoved = null;
  let hovedLinjer = null;
  let igjen = '';
  let underlinje = '';
  let dial = null;

  if (!harTimerIDag || currentMinutes >= schoolDayEnd) {
    hoved = (isWeekend || currentDay === 'Fredag' || currentDay === 'Lørdag' || currentDay === 'Søndag')
      ? 'God helg!'
      : 'Skoledagen er over';
    if (neste && nesteForste) {
      underlinje = `${nesteNavn} kl. ${nesteForste.time}: ${nesteForsteTekst}`;
    }
  } else if (currentMinutes < firstClassTime) {
    etikett = 'Skoledagen begynner om';
    hoved = formatDurationSmart(firstClassTime - currentMinutes);
    const forste = normalizedDayEvents.find(e => e.type === 'class');
    if (forste) underlinje = `Første time kl. ${forste.time}: ${linjerForOkt(primaryState, forste).join(' / ')}`;
  } else {
    etikett = 'Akkurat nå';
    const multi = displayStates.length > 1 || isClassMultiGrade(primaryState.classData, primaryState.className);
    if (multi) {
      const lines = buildCurrentActivityLines(displayStates.length > 1 ? displayStates : [primaryState]);
      if (lines.length === 1) hoved = lines[0];
      else hovedLinjer = lines;
    } else {
      hoved = currentActivity === 'FRI' ? 'Fri' : formatExpandedActivityDisplay(currentActivity);
    }
    if (activeEvent) {
      const nowSec = currentMinutes * 60 + (currentSeconds || 0);
      const minutterIgjen = Math.max(0, activeEvent.end - currentMinutes);
      const isBreak = activeEvent.type === 'break';
      igjen = isBreak
        ? `Neste time om ${formatDurationSmart(minutterIgjen)}`
        : `${formatDurationSmart(minutterIgjen)} igjen`;
      const subject = getCurrentSubjectColor(primaryState);
      dial = (
        <TimeTimerDial
          totalMs={Math.max(1, activeEvent.end - activeEvent.start) * 60 * 1000}
          remainingMs={Math.max(0, activeEvent.end * 60 - nowSec) * 1000}
          mode={loadTimerSettings().mode}
          color={subject?.color || TIMER_CLASSIC_RED}
          size={240}
          title={`${formatDurationSmart(minutterIgjen)} igjen`}
        />
      );
      const etter = normalizedDayEvents.find(e => e.start >= activeEvent.end);
      underlinje = etter
        ? `Slutter kl. ${formatMinutesAsTime(activeEvent.end)} · Så: ${linjerForOkt(primaryState, etter).join(' / ')}`
        : `Slutter kl. ${formatMinutesAsTime(activeEvent.end)} · Så er skoledagen over`;
    }
  }

  // Nedtelleren læreren har startet, og oppgaven som hører til
  const timerInnstillinger = loadTimerSettings();
  const timer = readTimerStatus();
  const timerFarge = timerInnstillinger.colorOverride
    || normalizeHexColor(getCurrentSubjectColor(primaryState)?.color)
    || TIMER_CLASSIC_RED;

  // Timen læreren har satt opp («Sett opp timen»)
  const time = dagensTime ? timeStatus(dagensTime, currentMinutes) : null;

  const visNedtellinger = countdownsVisible !== false && countdowns.length > 0;
  const visIDag = fane === 'idag' || !neste;
  const planState = visIDag ? primaryState : neste.state;
  const planDag = visIDag ? currentDay : neste.dag;

  return (
    <div className="elev-portrett" id="elev-portrett">
      <section className={`ep-naa${dial && visSkive ? ' har-skive' : ''}`} aria-live="polite" aria-label="Akkurat nå">
        {dial && <SkiveBryter vis={visSkive} onVeksle={vekslSkive} />}
        {dial && visSkive && <div className="ep-skive">{dial}</div>}
        <div className="ep-naa-tekst">
          {etikett && <div className="ep-etikett">{etikett}</div>}
          {hovedLinjer
            ? <div className="ep-hoved er-stabel">{hovedLinjer.map((l, i) => <div key={i}>{l}</div>)}</div>
            : <div className="ep-hoved">{hoved}</div>}
          {igjen && <div className="ep-igjen">{igjen}</div>}
          {underlinje && <div className="ep-under">{underlinje}</div>}
        </div>
      </section>

      {timer && (
        <button
          type="button"
          className={`ep-nedteller${timer.done ? ' er-ferdig' : ''}`}
          onClick={onOpenTimer}
          aria-label={`Nedteller: ${timer.done ? 'tiden er ute' : formatTimerReadout(timer.remainingMs)}. Åpne.`}
        >
          <TimeTimerDial
            totalMs={timer.totalMs}
            remainingMs={timer.remainingMs}
            mode={timerInnstillinger.mode}
            color={timerFarge}
            done={timer.done}
            size={120}
            title={timer.done ? 'Tiden er ute' : `Nedteller, ${formatTimerReadout(timer.remainingMs)} igjen`}
          />
          <div className="ep-nedteller-tekst">
            {timerInnstillinger.task && <div className="ep-nedteller-oppgave">{timerInnstillinger.task}</div>}
            <div className="ep-nedteller-tid">
              {timer.done ? 'Tiden er ute!' : formatTimerReadout(timer.remainingMs)}
              {timer.paused && <span className="ep-nedteller-pause">Pause</span>}
            </div>
          </div>
        </button>
      )}

      {dagensTime && (
        <section className="ep-time" aria-label="Dagens time">
          <div className="ep-time-topp">
            {dagensTime.tittel && <h2 className="ep-time-tittel">{dagensTime.tittel}</h2>}
            <span className="ep-time-tid">
              {dagensTime.fra}–{dagensTime.til}{time.status ? ` · ${time.status}` : ''}
            </span>
          </div>
          {dagensTime.maal && (
            <div className="ep-time-maal">
              <span className="ep-time-maal-merke"><Ikon navn="target" /> Mål</span>
              <span>{dagensTime.maal}</span>
            </div>
          )}
          {dagensTime.punkter.length > 0 && (
            <ol className="ep-time-punkter" aria-label="Agenda">
              {dagensTime.punkter.map((p, i) => (
                <li key={i} className={`${p.ferdig ? 'er-ferdig' : ''}${i === time.naaIndex ? ' er-naa' : ''}`.trim() || undefined}>
                  <span className="dt-nr">{p.ferdig ? <Ikon navn="check" strek={3} tittel="Gjort" /> : i + 1}</span>
                  <span className="ep-time-punkt">{p.tekst}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {visNedtellinger && (
        <div className="ep-nedtellinger" aria-label="Dager til">
          {countdowns.map((item, i) => {
            const d = getCountdownRemainingDisplay(item.targetDate, item.targetTime);
            return (
              <button key={item.id || i} type="button" className="ep-nedtelling" onClick={() => onEditCountdown?.(i)}>
                <span className="ep-nedtelling-tittel">{item.title}</span>
                <b>{d.value}</b> <span className="ep-nedtelling-enhet">{String(d.unit).toLowerCase()}</span>
              </button>
            );
          })}
        </div>
      )}

      <section className="ep-plan" aria-label="Timeplan">
        <div className="ep-plan-topp">
          <h2 className="ep-plan-tittel">
            {visIDag ? 'I dag' : nesteNavn}
            {(visIDag || neste.fram === 1) && <span className="ep-plan-dag">{planDag.toLowerCase()}</span>}
          </h2>
          {neste && (
            <div className="ep-faner" role="tablist" aria-label="Velg dag">
              <button
                type="button"
                role="tab"
                aria-selected={visIDag}
                className={`ep-fane${visIDag ? ' er-valgt' : ''}`}
                onClick={() => velg('idag')}
              >
                I dag
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!visIDag}
                className={`ep-fane${!visIDag ? ' er-valgt' : ''}`}
                onClick={() => velg('neste')}
              >
                {nesteNavn}
              </button>
            </div>
          )}
        </div>
        {visIDag && !harTimerIDag
          ? <div className="ep-tom">Ingen skole i dag.</div>
          : (
            <Plan
              state={planState}
              classes={classes}
              minutter={currentMinutes}
              erIDag={visIDag}
              editPermission={editPermission}
              onOpenEditModal={onOpenEditModal}
              dag={planDag}
              tempScheduleChanges={tempScheduleChanges}
            />
          )}
      </section>
    </div>
  );
}
