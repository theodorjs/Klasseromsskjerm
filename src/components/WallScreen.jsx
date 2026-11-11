import { useEffect, useLayoutEffect, useRef } from 'react';
import Timeline from './Timeline.jsx';
import Ikon from './Ikon.jsx';
import Ballong from './Ballong.jsx';
import useRolig from '../hooks/useRolig.js';
import { formatDurationSmart, getIsoWeekNumberForOslo } from '../utils/time.js';
import {
  formatExpandedActivityDisplay,
  buildCurrentActivityLines,
  isClassMultiGrade,
  formatEventTeachers,
} from '../utils/schedule.js';
import { getCurrentSubjectColor } from '../utils/color.js';

/** Faget krympes ikke under denne andelen av størrelsen i CSS. */
const MIN_FAG_SKALA = 0.4;

/**
 * Egen visning for en liten skjerm langt unna (den gamle iPaden på veggen).
 * Klokka og faget skal kunne leses bakerst i rommet, så de er størst.
 * Tid igjen, neste time, dag og dato står mindre.
 * Ingen nedteller-skive, ingen «Dager til», ingen verktøy; dagens tidslinje nederst.
 */
export default function WallScreen({
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
  bursdager = [],
  onExit,
}) {
  const weekNum = getIsoWeekNumberForOslo(new Date());
  const { synlig: knappSynlig, bareVisFoerst } = useRolig();
  const fagRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !e.defaultPrevented) onExit?.(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const subject = getCurrentSubjectColor(primaryState);

  let label = '';
  let activity = null;
  let stackLines = null;
  let remainingText = '';
  let nextText = '';
  let laerer = '';

  if (primaryState) {
    const { schoolDayEnd, firstClassTime, currentActivity, activeEvent, normalizedDayEvents } = primaryState;

    if (isWeekend) {
      activity = 'Endelig helg!';
    } else if (currentMinutes >= schoolDayEnd) {
      activity = currentDay === 'Fredag' ? 'Endelig helg!' : 'Skoledagen er over!';
    } else if (currentMinutes < firstClassTime) {
      label = 'Skoledagen begynner om';
      activity = formatDurationSmart(firstClassTime - currentMinutes);
    } else {
      label = 'Akkurat nå';
      const multi = displayStates.length > 1 || isClassMultiGrade(primaryState.classData, primaryState.className);
      if (multi) {
        const lines = buildCurrentActivityLines(displayStates.length > 1 ? displayStates : [primaryState]);
        // Samme fag for alle trinn blir én linje, og den får full størrelse
        if (lines.length === 1) activity = lines[0];
        else stackLines = lines;
      } else {
        activity = currentActivity === 'FRI' ? 'Fri' : formatExpandedActivityDisplay(currentActivity);
      }

      // Lærerne vises bare når én klasse står på skjermen
      if (activeEvent && displayStates.length <= 1) laerer = formatEventTeachers(activeEvent, primaryState.classData, primaryState.className);
      if (activeEvent) {
        const minutesLeft = Math.max(0, activeEvent.end - currentMinutes);
        remainingText = activeEvent.type === 'break'
          ? `Neste time om ${formatDurationSmart(minutesLeft)}`
          : `${formatDurationSmart(minutesLeft)} igjen`;
      }

      const next = normalizedDayEvents.find(e => e.start > currentMinutes && e.type === 'class');
      if (next) nextText = `Neste: ${formatExpandedActivityDisplay(next.displayActivity || next.activity)} kl. ${next.time}`;
    }
  }

  const fagNokkel = stackLines ? stackLines.join('|') : String(activity ?? '');

  // Faget står på én linje per trinn og krymper til det får plass i bredden
  useLayoutEffect(() => {
    const el = fagRef.current;
    if (!el) return undefined;
    function tilpass() {
      el.style.fontSize = '';
      const full = parseFloat(getComputedStyle(el).fontSize);
      const bredde = el.clientWidth;
      const trengs = el.scrollWidth;
      if (bredde > 0 && trengs > bredde + 0.5) {
        const skala = Math.max(MIN_FAG_SKALA, (bredde / trengs) * 0.98);
        el.style.fontSize = `${Math.floor(full * skala)}px`;
      }
    }
    tilpass();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(tilpass);
    observer.observe(el.parentElement || el);
    document.fonts?.ready?.then(tilpass).catch(() => {});
    return () => observer.disconnect();
  }, [fagNokkel]);

  return (
    <div className="vegg" id="vegg">
      <div className="vegg-info">
        <div className="vegg-date">{currentDay} {dateStr} · Uke {weekNum}{isSim ? ' (simulert)' : ''}</div>
        {bursdager.length > 0 && (
          <div className="vegg-bursdager">
            {bursdager.map(b => (
              <span key={b.nokkel} className="vegg-bursdag"><Ballong navn={b.fornavn} /><span>{b.setning[0]}<b>{b.fornavn}</b>{b.setning[1]}</span></span>
            ))}
          </div>
        )}
      </div>

      <div className="vegg-now">
        <div className="vegg-clock" aria-live="off">{currentTime}</div>
        {label && <div className="vegg-label">{label}</div>}
        <div
          ref={fagRef}
          className={`vegg-activity${stackLines ? ' is-stack' : ''}`}
          style={subject?.color ? { '--fagfarge': subject.color } : undefined}
        >
          {stackLines ? stackLines.map((line, i) => <div key={i}>{line}</div>) : activity}
        </div>
        {laerer && <div className="vegg-laerer" id="vegg-laerer">{laerer}</div>}
        {(remainingText || nextText) && (
          <div className="vegg-meta">
            {remainingText && <span className="vegg-remaining">{remainingText}</span>}
            {nextText && <span className="vegg-next">{nextText}</span>}
          </div>
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

      <button
        type="button"
        className={`k-btn k-btn--tilbake vegg-exit${knappSynlig ? '' : ' er-rolig'}`}
        title="Tilbake til vanlig visning (Esc)"
        aria-label="Avslutt veggskjerm"
        {...bareVisFoerst(onExit)}
      >
        <Ikon navn="x" /><span className="vegg-exit-tekst">Avslutt veggskjerm</span>
      </button>
    </div>
  );
}
