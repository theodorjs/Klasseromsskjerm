import { cloneDefaultClass } from '../constants.js';
import { pickSubjectColors, pickSubjectEmojis } from '../subjects.js';
import { getDefaultMultiGradeLabels, getActivitySubjectParts } from '../../utils/schedule.js';
import { TORDEROD_TIMEPLANER } from './torderod.js';

/** Klassene som ligger klare på hver skoles egen nettside, etter skole-id (se skoletema.js). */
const TIMEPLANER = { torderod: TORDEROD_TIMEPLANER };

/** Fagene som står i en timeplan, uten trinn («Matematikk 9.» → «Matematikk»). */
function fagITimeplan(schedule) {
  const fag = new Set();
  Object.values(schedule).flat().forEach(entry => {
    // Navnene i timeplanene er allerede fagnavnene i subjects.js
    getActivitySubjectParts(entry.activity).forEach(({ subject }) => { if (subject) fag.add(subject); });
  });
  return [...fag];
}

/**
 * Nye klasser med skolens timeplaner, eller null når skolen ikke har noen.
 * Hver klasse bygger på standardklassen (pauser, skoledagens tider), så den
 * oppfører seg som en klasse læreren har satt opp selv.
 */
export function skoleKlasser(skoleId) {
  const timeplaner = TIMEPLANER[skoleId];
  if (!timeplaner) return null;
  return Object.fromEntries(Object.entries(timeplaner).map(([navn, { multiGradeMode, schedule }]) => {
    const klasse = cloneDefaultClass();
    const fag = fagITimeplan(schedule);
    klasse.name = navn;
    klasse.teacher = '';
    klasse.multiGradeMode = multiGradeMode;
    if (multiGradeMode) klasse.multiGradeLabels = getDefaultMultiGradeLabels(navn);
    klasse.schedule = JSON.parse(JSON.stringify(schedule));
    // Pauser etter dagens siste time ville forlenget skoledagen (1.–2. slutter 12:25 på fredag)
    Object.keys(klasse.breaks).forEach(dag => {
      const slutt = (schedule[dag] || []).reduce((sist, e) => (e.end > sist ? e.end : sist), '');
      klasse.breaks[dag] = klasse.breaks[dag].filter(pause => !slutt || pause.time < slutt);
    });
    klasse.subjectColors = pickSubjectColors(fag);
    klasse.subjectEmojis = pickSubjectEmojis(fag);
    return [navn, klasse];
  }));
}
