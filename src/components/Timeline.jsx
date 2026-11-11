import { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { getMinutesFromTime, formatMinutesAsTime } from '../utils/time.js';
import {
  getClassScheduleState,
  normalizeActiveTimelineClassNames,
  getClassBadgeLabel,
  formatExpandedActivityDisplay,
  formatExpandedActivityLabel,
  getStoredSubjectEmoji,
  stripGradeSuffix,
  getTempScheduleKey,
} from '../utils/schedule.js';
import { getSubjectDefaultColor } from '../utils/color.js';
import { FagSymbol } from './Ikon.jsx';
import { erLystTema } from '../utils/tema.js';
import { formatEventTeachers } from '../utils/schedule.js';

/** Tidslinja med én rad: 62 px høy og 20 px over bunnen. Nedteller-knappen står klar av den. */
const TIDSLINJE_VANLIG_ROM = 82;

export default function Timeline({
  classes,
  currentDay,
  currentMinutes,
  useRealTime,
  realMinutes,
  activeTimelineClassNames,
  tempScheduleChanges,
  editPermission,
  themeMode,
  onOpenEditModal,
}) {
  const [activeHoverIdx, setActiveHoverIdx] = useState(null);

  const timelineClassNames = normalizeActiveTimelineClassNames(activeTimelineClassNames, classes, activeTimelineClassNames[0]);
  const timelineStates = timelineClassNames
    .map(className => getClassScheduleState(className, currentDay, currentMinutes, classes, tempScheduleChanges))
    .filter(Boolean);
  const hasRows = timelineStates.some(st => st.normalizedDayEvents.length > 0);

  const rootRef = useRef(null);

  // Pauser viser navnet når det får plass, ellers bare symbolet (ikke «aus»).
  // Merket settes rett på elementet, så det kan måles på nytt ved hver endring.
  const fitBreakLabels = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll('.event-box.break').forEach((box) => {
      const text = box.querySelector('.event-text');
      if (!text) return;
      box.removeAttribute('data-smal');
      const cs = getComputedStyle(box);
      const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (text.scrollWidth > room + 0.5) box.setAttribute('data-smal', '');
    });
  }, []);
  useLayoutEffect(fitBreakLabels);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => fitBreakLabels());
    observer.observe(root);
    document.fonts?.ready?.then(fitBreakLabels).catch(() => {});
    return () => observer.disconnect();
  }, [fitBreakLabels, hasRows]);

  // Hvor høyt tidslinja rekker fra bunnen av skjermen. Med flere klasser blir
  // den høyere, og Nedteller-knappen og hovedkortet flytter seg opp etter den
  // (se del-tidslinje-rom.css) i stedet for å dekke slutten av dagen.
  // Måles uten getBoundingClientRect, så det stemmer også mens delt skjerm glir.
  useEffect(() => {
    const root = rootRef.current;
    const html = document.documentElement;
    // Bare tidslinja på hovedskjermen; veggskjermen og «Vis for klassen» har egen plassering
    if (!root || !root.closest('#split-bottom') || typeof ResizeObserver === 'undefined') return undefined;
    const maal = () => {
      const cs = getComputedStyle(root);
      if (cs.position !== 'absolute') return;
      const rom = Math.round(root.offsetHeight + (parseFloat(cs.bottom) || 0));
      const ekstra = Math.max(0, rom - TIDSLINJE_VANLIG_ROM);
      html.style.setProperty('--tidslinje-rom', `${rom}px`);
      html.style.setProperty('--tidslinje-ekstra', `${ekstra}px`);
      document.body.classList.toggle('tidslinje-hoy', ekstra > 0);
    };
    const observer = new ResizeObserver(maal);
    observer.observe(root);
    window.addEventListener('resize', maal);
    maal();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', maal);
      html.style.removeProperty('--tidslinje-rom');
      html.style.removeProperty('--tidslinje-ekstra');
      document.body.classList.remove('tidslinje-hoy');
    };
  }, [hasRows]);

  if (!hasRows) {
    const noScheduleText = ["Lørdag", "Søndag"].includes(currentDay)
      ? "Ingen undervisning i dag"
      : "Ingen timeplan for valgt dag.";
    return (
      <div className="timeline" id="timeline">
        <div className="timeline-empty">{noScheduleText}</div>
      </div>
    );
  }

  const multipleClasses = timelineStates.length > 1;
  const markerTime = useRealTime ? realMinutes : currentMinutes;

  const isLightMode = erLystTema(themeMode);
  const isDarkMode = !isLightMode;

  return (
    <div className={`timeline${multipleClasses ? '' : ''}`} id="timeline" ref={rootRef}>
      {timelineStates.map((state, stateIdx) => {
        const schoolDayDuration = Math.max(1, state.schoolDayEnd - state.schoolDayStart);
        const markerPos = markerTime >= state.schoolDayStart && markerTime < state.schoolDayEnd
          ? ((markerTime - state.schoolDayStart) / schoolDayDuration) * 100
          : null;

        return (
          <div key={state.className} className={`timeline-row${multipleClasses ? ' with-badge' : ''}`}>
            {multipleClasses && (
              <div className="timeline-class-badge">{getClassBadgeLabel(state.className)}</div>
            )}
            <div
              className="timeline-track"
              data-school-start={state.schoolDayStart}
              data-school-end={state.schoolDayEnd}
            >
              {markerPos !== null && (
                <div className="marker" style={{ display: 'block', left: `${markerPos}%` }}></div>
              )}

              {state.normalizedDayEvents.map((event, eventIdx) => {
                const widthPercent = ((event.end - event.start) / schoolDayDuration) * 100;
                const eventKey = getTempScheduleKey(state.className, currentDay, event.time);
                const legacyEventKey = `${currentDay}-${event.time}`;
                const hasTempActivity = Object.prototype.hasOwnProperty.call(tempScheduleChanges.changes, eventKey)
                  || Object.prototype.hasOwnProperty.call(tempScheduleChanges.changes, legacyEventKey);
                const displayActivity = event.displayActivity || event.activity;
                const activities = displayActivity.split('/').map(a => a.trim()).filter(Boolean);
                const isActive = markerTime >= event.start && markerTime < event.end;
                const hoverKey = `${stateIdx}-${eventIdx}`;
                const activityText = formatExpandedActivityDisplay(displayActivity);
                const isBreak = event.type === "break";

                let boxStyle = {};
                if (hasTempActivity && event.type === "class") {
                  boxStyle = {
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    boxShadow: 'none'
                  };
                } else {
                  const subjectColors = state.classData.subjectColors || {};
                  const activityColors = activities.map(a => {
                    const trimmed = a.trim();
                    if (subjectColors[trimmed]) return subjectColors[trimmed];
                    const base = stripGradeSuffix(trimmed);
                    if (base && subjectColors[base]) return subjectColors[base];
                    return getSubjectDefaultColor(trimmed);
                  }).filter(c => c && c !== '#ffffff' && c !== '#FFFFFF');

                  if (activityColors.length > 0) {
                    if (activityColors.length > 1) {
                      boxStyle.background = `linear-gradient(to right, ${activityColors.join(', ')})`;
                      boxStyle.border = '1px solid transparent';
                    } else {
                      boxStyle.backgroundColor = activityColors[0];
                    }
                    boxStyle.color = '#fff';
                    boxStyle.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
                  } else if (isLightMode) {
                    boxStyle.backgroundColor = event.type === "break" ? "#bbb" : "#ddd";
                  } else if (isDarkMode) {
                    boxStyle.backgroundColor = event.type === "break" ? "#5a6a8a" : "#4a5a7a";
                  } else {
                    boxStyle.backgroundColor = event.type === "break" ? "#777" : "#555";
                  }
                }

                const handleBoxClick = () => {
                  if (!editPermission) return;
                  onOpenEditModal({
                    eventKey,
                    legacyEventKey,
                    displayActivity,
                    hasTempActivity
                  });
                };

                return (
                  <div key={eventIdx} style={{ display: 'contents' }}>
                    <div
                      className={`event-box${event.type === "break" ? " break" : ""}${editPermission ? " editable" : ""}${isActive ? " active" : ""}`}
                      title={isBreak ? activityText : undefined}
                      style={{ width: `calc(${widthPercent}% - 2px)`, ...boxStyle }}
                      data-start-time={event.start}
                      data-end-time={event.end}
                      data-class-name={state.className}
                      onMouseEnter={() => setActiveHoverIdx(hoverKey)}
                      onMouseLeave={() => setActiveHoverIdx(null)}
                      onClick={handleBoxClick}
                    >
                      {isBreak ? (
                        <>
                          <FagSymbol verdi={getStoredSubjectEmoji(state.className, activities[0], classes)} reserve="pause" className="event-symbol" />
                          <span className="event-text">{activityText}</span>
                        </>
                      ) : activityText}
                    </div>
                    <div
                      className={`hover-box${activeHoverIdx === hoverKey ? ' active' : ''}`}
                      style={activeHoverIdx === hoverKey ? { left: `${((event.start - state.schoolDayStart) / schoolDayDuration * 100) + (widthPercent / 2)}%` } : {}}
                    >
                      {activities.map((activity, i) => {
                        const emoji = getStoredSubjectEmoji(state.className, activity, classes);
                        return (
                          <div key={i} className="activity-name">
                            <FagSymbol verdi={emoji} className="activity-symbol" /> {formatExpandedActivityLabel(activity)}
                          </div>
                        );
                      })}
                      {formatEventTeachers(event, state.classData, state.className) && <div className="teacher">{formatEventTeachers(event, state.classData, state.className)}</div>}
                      <div className="time">{event.time}–{formatMinutesAsTime(event.end)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
