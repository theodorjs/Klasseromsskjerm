import { useEffect, useState } from 'react';
import { safeGetItem } from '../utils/storage.js';
import { getOsloTimeAndDay, getMinutesFromTime } from '../utils/time.js';
import { getClassScheduleState } from '../utils/schedule.js';
import { getCurrentSubjectColor } from '../utils/color.js';
import { lesTimer, finnSynligTime, dagensDato, timeTittel, DAGENS_TIME_KEY } from './useDagensTime.js';

const INGEN = { color: null, name: null, lessonTitle: null };

/** Nøklene hovedsiden lagrer timeplanen og «Agenda for timen» under. */
const KILDER = ['klasseromData', 'currentClassName', DAGENS_TIME_KEY];

/**
 * Faget som pågår nå etter timeplanen på denne enheten, regnet ut på samme
 * måte som hovedsiden gjør for nedtelleren. Bare lesing: siden som bruker
 * dette, skal aldri endre eller opprette en timeplan.
 */
export function lesFagNaa() {
  try {
    const raw = safeGetItem('klasseromData');
    if (!raw) return INGEN;
    const classes = JSON.parse(raw);
    if (!classes || typeof classes !== 'object' || Array.isArray(classes)) return INGEN;
    const navn = Object.keys(classes);
    if (!navn.length) return INGEN;
    const lagret = safeGetItem('currentClassName');
    const klasse = Object.prototype.hasOwnProperty.call(classes, lagret) ? lagret : navn[0];

    const { currentDay, realOsloTime } = getOsloTimeAndDay();
    const minutter = getMinutesFromTime(realOsloTime);
    // Midlertidige endringer gjelder bare fanen de ble gjort i (sessionStorage)
    const state = getClassScheduleState(klasse, currentDay, minutter, classes, { date: '', changes: {} });
    const fag = getCurrentSubjectColor(state);
    const time = finnSynligTime(lesTimer(), dagensDato(), currentDay, minutter);
    return {
      color: fag?.color || null,
      name: fag?.name || null,
      lessonTitle: (time && timeTittel(time)) || null,
    };
  } catch (err) {
    console.warn('Kunne ikke lese timeplanen for nedtelleren:', err);
    return INGEN;
  }
}

function lik(a, b) {
  return a.color === b.color && a.name === b.name && a.lessonTitle === b.lessonTitle;
}

/** Som lesFagNaa, men holdes oppdatert: hvert 15. sekund og når hovedsiden lagrer. */
export default function useFagNaa() {
  const [fag, setFag] = useState(lesFagNaa);

  useEffect(() => {
    const oppdater = () => setFag(prev => {
      const neste = lesFagNaa();
      return lik(prev, neste) ? prev : neste;
    });
    const naarLagret = (e) => { if (e.key === null || KILDER.includes(e.key)) oppdater(); };
    const id = setInterval(oppdater, 15000);
    window.addEventListener('storage', naarLagret);
    document.addEventListener('visibilitychange', oppdater);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', naarLagret);
      document.removeEventListener('visibilitychange', oppdater);
    };
  }, []);

  return fag;
}
