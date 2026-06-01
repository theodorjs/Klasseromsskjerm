import { useState, useCallback } from 'react';
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

  if (timelineStates.length === 0 || timelineStates.every(s => s.normalizedDayEvents.length === 0)) {
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

  const isLightMode = themeMode === '0' || themeMode === '3';
  const isDarkMode = !isLightMode;

  return (
    <div className={`timeline${multipleClasses ? '' : ''}`} id="timeline">
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
                      style={{ width: `calc(${widthPercent}% - 2px)`, ...boxStyle }}
                      data-start-time={event.start}
                      data-end-time={event.end}
                      data-class-name={state.className}
                      onMouseEnter={() => setActiveHoverIdx(hoverKey)}
                      onMouseLeave={() => setActiveHoverIdx(null)}
                      onClick={handleBoxClick}
                    >
                      {formatExpandedActivityDisplay(displayActivity)}
                    </div>
                    <div
                      className={`hover-box${activeHoverIdx === hoverKey ? ' active' : ''}`}
                      style={activeHoverIdx === hoverKey ? { left: `${((event.start - state.schoolDayStart) / schoolDayDuration * 100) + (widthPercent / 2)}%` } : {}}
                    >
                      {activities.map((activity, i) => {
                        const emoji = getStoredSubjectEmoji(state.className, activity, classes);
                        return (
                          <div key={i} className="activity-name">
                            {emoji} {formatExpandedActivityLabel(activity)}
                          </div>
                        );
                      })}
                      <div className="time">{event.time}-{event.end || formatMinutesAsTime(event.end)}</div>
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
