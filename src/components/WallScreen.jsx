import TimeTimerDial from './TimeTimerDial.jsx';
import Timeline from './Timeline.jsx';
import { formatDurationSmart, getIsoWeekNumberForOslo } from '../utils/time.js';
import {
  formatExpandedActivityDisplay,
  buildCurrentActivityLinesForState,
  isClassMultiGrade,
} from '../utils/schedule.js';
import { getCurrentSubjectColor } from '../utils/color.js';
import { TIMER_CLASSIC_RED, loadTimerSettings } from '../utils/timer.js';
import { getCountdownRemainingDisplay } from '../utils/schedule.js';
import { useEffect } from 'react';

/**
 * Egen visning for en liten skjerm langt unna (den gamle iPaden på veggen):
 * klokke, hva som skjer nå, hvor lenge det er igjen som en TimeTimer-skive,
 * og dagens tidslinje. Ingen verktøy, ingen meny.
 */
export default function WallScreen({
  primaryState,
  displayStates,
  currentMinutes,
  currentSeconds,
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
  onExit,
}) {
  const weekNum = getIsoWeekNumberForOslo(new Date());
  // Skiva følger samme skala som nedtelleren (full ved start, eller alltid 60 min)
  const dialMode = loadTimerSettings().mode;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !e.defaultPrevented) onExit?.(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);
  const subject = getCurrentSubjectColor(primaryState);
  const discColor = subject?.color || TIMER_CLASSIC_RED;

  let label = '';
  let activity = null;
  let stackLines = null;
  let remainingText = '';
  let nextText = '';
  let dial = null;

  if (primaryState) {
    const { schoolDayEnd, firstClassTime, currentActivity, activeEvent, normalizedDayEvents } = primaryState;
    const nowSec = currentMinutes * 60 + (currentSeconds || 0);

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
        stackLines = (displayStates.length > 1 ? displayStates : [primaryState]).flatMap(s => buildCurrentActivityLinesForState(s));
      } else {
        activity = currentActivity === 'FRI' ? 'Fri' : formatExpandedActivityDisplay(currentActivity);
      }

      if (activeEvent) {
        const totalMs = Math.max(1, activeEvent.end - activeEvent.start) * 60 * 1000;
        const remainingMs = Math.max(0, activeEvent.end * 60 - nowSec) * 1000;
        const minutesLeft = Math.max(0, activeEvent.end - currentMinutes);
        const isBreak = activeEvent.type === 'break';
        remainingText = isBreak
          ? `Neste time om ${formatDurationSmart(minutesLeft)}`
          : `${formatDurationSmart(minutesLeft)} igjen`;
        dial = (
          <TimeTimerDial
            totalMs={totalMs}
            remainingMs={remainingMs}
            mode={dialMode}
            color={discColor}
            title={`${formatDurationSmart(minutesLeft)} igjen av ${activeEvent.displayActivity || activeEvent.activity}`}
          />
        );
      }

      const next = normalizedDayEvents.find(e => e.start > currentMinutes && e.type === 'class');
      if (next) nextText = `Neste: ${formatExpandedActivityDisplay(next.displayActivity || next.activity)} kl. ${next.time}`;
    }
  }

  return (
    <div className="vegg" id="vegg">
      <div className="vegg-top">
        <div className="vegg-clock" aria-live="off">{currentTime}</div>
        <div className="vegg-date">{currentDay} {dateStr} · Uke {weekNum}{isSim ? ' (simulert)' : ''}</div>
        {countdownsVisible && countdowns.length > 0 && (
          <div className="vegg-countdowns" aria-label="Nedtellinger">
            {countdowns.map((item, i) => {
              const d = getCountdownRemainingDisplay(item.targetDate, item.targetTime);
              return (
                <span key={item.id || i} className="vegg-countdown">
                  {item.title}: <b>{d.value}</b> {d.unit}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="vegg-now">
        {dial && <div className="vegg-dial">{dial}</div>}
        <div className="vegg-text">
          {label && <div className="vegg-label">{label}</div>}
          {stackLines
            ? <div className="vegg-activity is-stack">{stackLines.map((line, i) => <div key={i}>{line}</div>)}</div>
            : <div className="vegg-activity">{activity}</div>}
          {remainingText && <div className="vegg-remaining">{remainingText}</div>}
          {nextText && <div className="vegg-next">{nextText}</div>}
        </div>
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

      <button type="button" className="vegg-exit" onClick={onExit} title="Tilbake til vanlig visning">
        Avslutt veggskjerm
      </button>
    </div>
  );
}
