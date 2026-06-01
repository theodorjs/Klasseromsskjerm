import { formatDurationSmart, getMinutesFromTime } from '../utils/time.js';
import {
  formatExpandedActivityDisplay,
  buildCurrentActivityLinesForState,
  isClassMultiGrade,
  getClassMultiGradeLabels
} from '../utils/schedule.js';

export default function MainContainer({ primaryState, displayStates, currentMinutes, isWeekend, currentDay }) {
  if (!primaryState) return <div className="container" id="main-container"></div>;

  const {
    schoolDayEnd,
    firstClassTime,
    currentActivity,
    currentEventEnd,
    breakSchedule,
    todaySchedule,
    classData
  } = primaryState;

  let content = null;
  let countdownText = '';

  if (isWeekend) {
    content = <div id="current-activity" className="bold">Endelig helg!</div>;
  } else if (currentMinutes >= schoolDayEnd) {
    content = currentDay === "Fredag"
      ? <div id="current-activity" className="bold">Endelig helg!</div>
      : <div id="current-activity" className="bold">Skoledagen er over!</div>;
  } else if (currentMinutes < firstClassTime) {
    const remaining = formatDurationSmart(firstClassTime - currentMinutes);
    countdownText = remaining;
    content = (
      <>
        <div className="main-start-label">Skoledagen begynner om</div>
        <div id="current-activity" className="bold"></div>
        <div className="thin countdown" id="countdown-container">{remaining}</div>
      </>
    );
  } else {
    const shouldUseMultiLine = displayStates.length > 1 || isClassMultiGrade(classData, primaryState.className);
    if (shouldUseMultiLine) {
      const lines = (displayStates.length > 1 ? displayStates : [primaryState])
        .flatMap(s => buildCurrentActivityLinesForState(s));
      content = (
        <>
          <div className="thin">Akkurat nå:</div>
          <div id="current-activity" className="current-activity-stack">
            {lines.map((line, i) => (
              <div key={i} className="current-activity-line">{line}</div>
            ))}
          </div>
          <div className="thin countdown" id="countdown-container">{getCountdownText()}</div>
        </>
      );
    } else {
      const displayStr = formatExpandedActivityDisplay(currentActivity);
      content = (
        <>
          <div className="thin">Akkurat nå:</div>
          <div id="current-activity" className="bold">{displayStr}</div>
          <div className="thin countdown" id="countdown-container">{getCountdownText()}</div>
        </>
      );
    }
  }

  function getCountdownText() {
    if (currentActivity === "Mat") {
      if (currentEventEnd !== null && currentMinutes < currentEventEnd) {
        return `Det er ${formatDurationSmart(currentEventEnd - currentMinutes)} igjen av spisetiden`;
      }
      for (const e of todaySchedule) {
        const t = getMinutesFromTime(e.time);
        if (currentMinutes < t) return `Det er ${formatDurationSmart(t - currentMinutes)} igjen av spisetiden`;
      }
    } else if (["Pause", "Storefri"].includes(currentActivity)) {
      if (currentEventEnd !== null && currentMinutes < currentEventEnd) {
        return `Neste time begynner om ${formatDurationSmart(currentEventEnd - currentMinutes)}`;
      }
      for (const e of todaySchedule) {
        const t = getMinutesFromTime(e.time);
        if (currentMinutes < t) return `Neste time begynner om ${formatDurationSmart(t - currentMinutes)}`;
      }
    } else if (currentActivity !== "FRI") {
      if (currentEventEnd !== null && currentMinutes < currentEventEnd) {
        return `Det er ${formatDurationSmart(currentEventEnd - currentMinutes)} igjen av timen`;
      }
      let nextTime = null;
      let isNextBreak = false;
      for (const b of breakSchedule) {
        const t = getMinutesFromTime(b.time);
        if (currentMinutes < t) { nextTime = t; isNextBreak = true; break; }
      }
      if (!nextTime && currentMinutes < schoolDayEnd) nextTime = schoolDayEnd;
      if (nextTime) {
        const diff = nextTime - currentMinutes;
        return isNextBreak
          ? `Neste pause begynner om ${formatDurationSmart(diff)}`
          : `Det er ${formatDurationSmart(diff)} igjen av timen`;
      }
    }
    return '';
  }

  return (
    <div className="container" id="main-container">
      {content}
    </div>
  );
}
