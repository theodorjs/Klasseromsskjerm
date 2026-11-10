import { useLayoutEffect, useRef } from 'react';
import { formatDurationHoursMinutes, formatMinutesAsTime, getIsoWeekNumberForOslo } from '../utils/time.js';
import {
  formatExpandedActivityDisplay,
  buildCurrentActivityLines,
  isClassMultiGrade,
  getClassScheduleState,
  getStoredSubjectEmoji,
} from '../utils/schedule.js';
import { getCurrentSubjectColor, getReadableAgendaTextColor } from '../utils/color.js';
import { TIMER_CLASSIC_RED } from '../utils/timer.js';
import TimeTimerDial from './TimeTimerDial.jsx';
import { FagSymbol } from './Ikon.jsx';
import SkiveBryter from './SkiveBryter.jsx';
import useVisSkive from '../hooks/useVisSkive.js';

const SKOLEDAGER = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

/**
 * Krymper skriften til teksten får plass i boksen (bredde og høyde).
 * Tavla skal leses fra bakerste rad, så teksten starter så stor som mulig.
 */
function useFitText(ref, key) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    function fit() {
      el.style.fontSize = '';
      let size = parseFloat(window.getComputedStyle(el).fontSize) || 16;
      for (let i = 0; i < 24; i++) {
        const tooWide = el.scrollWidth > el.clientWidth + 1;
        // Høyden teller bare når boksen har en makshøyde (to linjer); Å og g stikker litt ut ellers
        const maxHeight = parseFloat(window.getComputedStyle(el).maxHeight);
        const tooTall = Number.isFinite(maxHeight) && el.scrollHeight > maxHeight + size * 0.2;
        if (!tooWide && !tooTall) break;
        size *= 0.92;
        el.style.fontSize = `${size}px`;
      }
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [ref, key]);
}

/** «26» + «min igjen», eller «1 t 20 min» + «igjen» over en time. */
function durationParts(minutes, suffix) {
  const safe = Math.max(0, Math.round(minutes));
  if (safe > 60) {
    return { number: formatDurationHoursMinutes(safe).replace(/\.$/, ''), unit: suffix };
  }
  return { number: String(safe), unit: suffix ? `min ${suffix}` : 'min' };
}

/** Første time neste skoledag (etter skoleslutt og i helga). */
function findNextSchoolDayStart(primaryState, currentDay, isWeekend) {
  const { className, classData } = primaryState;
  if (!classData?.schedule) return null;
  const todayIndex = isWeekend ? -1 : SKOLEDAGER.indexOf(currentDay);
  for (let step = 1; step <= 5; step++) {
    const index = (todayIndex + step) % 5;
    const day = SKOLEDAGER[index];
    // Ukeparitet: går vi forbi fredag, gjelder neste uke
    const week = getIsoWeekNumberForOslo(new Date()) + (index <= todayIndex || isWeekend ? 1 : 0);
    const state = getClassScheduleState(className, day, 0, { [className]: classData }, { changes: {} }, week);
    const first = state?.normalizedDayEvents?.find(e => e.type === 'class');
    if (first) {
      const isTomorrow = todayIndex >= 0 && index === todayIndex + 1;
      return { event: first, when: isTomorrow ? 'I morgen' : day };
    }
  }
  return null;
}

function NextRow({ label, event, primaryState, timeText, fallbackName, fallbackIcon, fitKey = '' }) {
  const ref = useRef(null);
  const raw = event ? (event.displayActivity || event.activity) : '';
  const name = event ? formatExpandedActivityDisplay(raw) : fallbackName;
  useFitText(ref, `${label}|${name}|${timeText}|${fitKey}`);
  const subject = event ? getCurrentSubjectColor({ currentActivity: raw, classData: primaryState.classData }) : null;
  const symbol = event
    ? getStoredSubjectEmoji(primaryState.className, String(raw).split('/')[0].trim(), { [primaryState.className]: primaryState.classData })
    : null;
  return (
    <div className="hs-neste" ref={ref}>
      <span className="hs-neste-etikett">{label}</span>
      <span className="hs-neste-fag">
        <span
          className={`hs-neste-merke${subject ? '' : ' is-noytral'}`}
          style={subject ? { background: subject.color, color: getReadableAgendaTextColor(subject.color) } : undefined}
          aria-hidden="true"
        >
          <FagSymbol verdi={symbol && symbol !== 'circle-help' ? symbol : null} reserve={fallbackIcon || 'clock'} />
        </span>
        <span className="hs-neste-navn">{name}</span>
      </span>
      {timeText && <span className="hs-neste-tid">{timeText}</span>}
    </div>
  );
}

/**
 * Hovedtavla: laget for å leses fra bakerste rad på tre sekunder.
 * Hva skjer nå (stort), hvor lenge er det igjen (tall + skive), hva kommer etterpå.
 */
export default function MainContainer({ primaryState, displayStates, currentMinutes, currentSeconds = 0, isWeekend, currentDay }) {
  const heroRef = useRef(null);
  const [visSkive, vekslSkive] = useVisSkive();

  let label = '';
  let heroLines = [];
  let remaining = null;
  let dial = null;
  let next = null;
  let phase = 'tom';

  if (primaryState) {
    const { schoolDayEnd, firstClassTime, currentActivity, activeEvent, normalizedDayEvents, classData, className } = primaryState;
    const events = normalizedDayEvents || [];

    if (isWeekend || currentMinutes >= schoolDayEnd) {
      phase = 'fri';
      heroLines = [isWeekend || currentDay === 'Fredag' ? 'God helg!' : 'Skoledagen er over'];
      const upcoming = findNextSchoolDayStart(primaryState, currentDay, isWeekend);
      if (upcoming) {
        next = { label: upcoming.when, event: upcoming.event, timeText: `kl. ${formatMinutesAsTime(upcoming.event.start)}` };
      }
    } else if (currentMinutes < firstClassTime) {
      phase = 'for';
      label = 'Skoledagen begynner om';
      remaining = durationParts(firstClassTime - currentMinutes, '');
      const first = events.find(e => e.type === 'class') || events[0];
      if (first) next = { label: 'Første time', event: first, timeText: `kl. ${formatMinutesAsTime(first.start)}` };
    } else {
      phase = 'na';
      label = 'Nå';
      const multi = (displayStates?.length || 0) > 1 || isClassMultiGrade(classData, className);
      if (multi) {
        heroLines = buildCurrentActivityLines(displayStates.length > 1 ? displayStates : [primaryState]);
      } else {
        heroLines = [currentActivity === 'FRI' ? 'Fri' : formatExpandedActivityDisplay(currentActivity)];
      }

      // Igjen: til denne økta slutter, eller til neste starter når det er et hull i timeplanen
      const upcoming = events.find(e => e.start > currentMinutes);
      const endMinutes = activeEvent ? activeEvent.end : (upcoming ? upcoming.start : schoolDayEnd);
      const minutesLeft = Math.max(0, endMinutes - currentMinutes);
      remaining = durationParts(minutesLeft, 'igjen');

      if (activeEvent) {
        const subject = getCurrentSubjectColor(primaryState);
        const nowSec = currentMinutes * 60 + (currentSeconds || 0);
        dial = (
          <TimeTimerDial
            totalMs={Math.max(1, activeEvent.end - activeEvent.start) * 60 * 1000}
            remainingMs={Math.max(0, activeEvent.end * 60 - nowSec) * 1000}
            mode="fit"
            color={subject?.color || TIMER_CLASSIC_RED}
            size={400}
            title={`${minutesLeft} min igjen av ${heroLines.join(' / ')}`}
          />
        );
      }

      const nextEvent = events.find(e => e !== activeEvent && e.start >= endMinutes) || null;
      next = nextEvent
        ? { label: 'Neste', event: nextEvent, timeText: `kl. ${formatMinutesAsTime(nextEvent.start)}` }
        : { label: 'Neste', event: null, fallbackName: 'Skoleslutt', fallbackIcon: 'backpack', timeText: `kl. ${formatMinutesAsTime(schoolDayEnd)}` };
    }
  }

  // Skiva kan skjules; da står teksten midt i boksen (samme oppsett som før skolestart)
  const kanHaSkive = !!dial;
  const skive = visSkive ? dial : null;
  const fitKey = skive ? 'skive' : 'uten';

  useFitText(heroRef, `${heroLines.join('|')}|${fitKey}`);

  if (!primaryState) return <div className="container" id="main-container"></div>;

  const isStack = heroLines.length > 1;

  return (
    <div className={`container hs-tavle hs-${phase}${skive ? ' har-skive' : ''}`} id="main-container">
      {kanHaSkive && <SkiveBryter vis={visSkive} onVeksle={vekslSkive} />}
      {skive && <div className="hs-skive">{skive}</div>}
      <div className="hs-tekst">
        {label && <div className="hs-etikett">{label}</div>}
        {heroLines.length > 0 && (
          <div id="current-activity" ref={heroRef} className={`hs-fag${isStack ? ' is-stack' : ''}`}>
            {heroLines.map((line, i) => <div key={i} className="hs-fag-linje">{line}</div>)}
          </div>
        )}
        {remaining && (
          <div className="hs-igjen" id="countdown-container">
            <span className="hs-igjen-tall">{remaining.number}</span>
            <span className="hs-igjen-enhet">{remaining.unit}</span>
          </div>
        )}
        {next && <NextRow primaryState={primaryState} fitKey={fitKey} {...next} />}
      </div>
    </div>
  );
}
