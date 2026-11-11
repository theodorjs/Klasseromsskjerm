/**
 * Timeplanene for alle klassene på Torderød skole, skoleåret 2026/27.
 * Brukes når Klasseskjerm åpnes første gang på skolens nettside (se
 * skoleKlasser i src/data/skoler/index.js): da ligger klassene klare.
 *
 * Fagene er hentet fra ukeplanene for uke 45 og 46 (bare faget, ikke ukas
 * innhold). Lærerne er hovedlærerne i lærernes grunnplan 2026/27, høyst to
 * per fag. I en fådelt økt hører første lærer til første trinn. I en
 * parallell økt har hvert fag sin egen lærergruppe, i fagenes rekkefølge:
 *   Valgfag (onsdag, 8.–10.): Friluftsliv med Rune og Andreas, Design og
 *     redesign med Maria.
 *   Fredag (8.–10.): Spansk med Ana Maria, Tysk med Barbara og
 *     Arbeidslivsfag med Eirik.
 * Leksehjelp tirsdag 5. time (8.–10.) er et valgfritt tilbud.
 */

export const TORDEROD_TIMEPLANER = {
  "1. og 2.": {
    multiGradeMode: true,
    schedule: {
      Mandag: [
        { time: "08:30", end: "09:30", activity: "Norsk 1. / Norsk 2.", teachers: ["Ann-Margreth", "Hilde"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Ann-Margreth"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Ann-Margreth"] },
        { time: "12:35", end: "13:35", activity: "Musikk", teachers: ["Hilde"] },
      ],
      Tirsdag: [
        { time: "08:30", end: "09:30", activity: "Norsk", teachers: ["Ann-Margreth"] },
        { time: "09:40", end: "10:40", activity: "Matematikk", teachers: ["Ann-Margreth"] },
        { time: "11:25", end: "12:25", activity: "Engelsk", teachers: ["Ann-Margreth"] },
        { time: "12:35", end: "13:35", activity: "Kroppsøving", teachers: ["Ann-Margreth"] },
      ],
      Onsdag: [
        { time: "08:30", end: "09:30", activity: "Norsk 1. / Norsk 2.", teachers: ["Ann-Margreth", "Hilde"] },
        { time: "09:40", end: "10:40", activity: "Matematikk", teachers: ["Ann-Margreth"] },
        { time: "11:25", end: "12:25", activity: "Kunst og håndverk", teachers: ["Ann-Margreth"] },
        { time: "12:35", end: "13:35", activity: "KRLE", teachers: ["Ann-Margreth"] },
      ],
      Torsdag: [
        { time: "08:30", end: "09:30", activity: "Uteskole", teachers: ["Ann-Margreth"] },
        { time: "09:40", end: "10:40", activity: "Uteskole", teachers: ["Ann-Margreth"] },
        { time: "11:25", end: "12:25", activity: "Uteskole", teachers: ["Ann-Margreth"] },
        { time: "12:35", end: "13:35", activity: "Uteskole", teachers: ["Ann-Margreth"] },
      ],
      Fredag: [
        { time: "08:30", end: "09:30", activity: "Norsk", teachers: ["Ann-Margreth"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Ann-Margreth"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Ann-Margreth"] },
      ],
    },
  },
  "3. og 4.": {
    multiGradeMode: true,
    schedule: {
      Mandag: [
        { time: "08:30", end: "09:30", activity: "Kroppsøving", teachers: ["Ingibjörg"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Hilde"] },
        { time: "11:25", end: "12:25", activity: "Norsk", teachers: ["Hilde"] },
        { time: "12:35", end: "13:35", activity: "Musikk", teachers: ["Nina"] },
      ],
      Tirsdag: [
        { time: "08:30", end: "09:30", activity: "Norsk", teachers: ["Hilde"] },
        { time: "09:40", end: "10:40", activity: "Matematikk", teachers: ["Ingibjörg"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Ingibjörg"] },
        { time: "12:35", end: "13:35", activity: "Engelsk", teachers: ["Ingibjörg"] },
      ],
      Onsdag: [
        { time: "08:30", end: "09:30", activity: "Matematikk", teachers: ["Ingibjörg"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Hilde"] },
        { time: "11:25", end: "12:25", activity: "Kunst og håndverk", teachers: ["Maria"] },
        { time: "12:35", end: "13:35", activity: "KRLE", teachers: ["Ingibjörg"] },
      ],
      Torsdag: [
        { time: "08:30", end: "09:30", activity: "Uteskole", teachers: ["Ingibjörg"] },
        { time: "09:40", end: "10:40", activity: "Uteskole", teachers: ["Ingibjörg"] },
        { time: "11:25", end: "12:25", activity: "Uteskole", teachers: ["Ingibjörg"] },
        { time: "12:35", end: "13:35", activity: "Uteskole", teachers: ["Ingibjörg"] },
      ],
      Fredag: [
        { time: "08:30", end: "09:30", activity: "Norsk", teachers: ["Hilde"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Hilde"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Ingibjörg"] },
        { time: "12:35", end: "13:35", activity: "Samfunnsfag", teachers: ["Ingibjörg"] },
      ],
    },
  },
  "5. og 6.": {
    multiGradeMode: true,
    schedule: {
      Mandag: [
        { time: "08:30", end: "09:30", activity: "Kunst og håndverk 5. / Mat og helse 6.", teachers: ["Maria", "Eirik"] },
        { time: "09:40", end: "10:40", activity: "Kunst og håndverk 5. / Mat og helse 6.", teachers: ["Maria", "Eirik"] },
        { time: "11:25", end: "12:25", activity: "Kroppsøving", teachers: ["Eirik", "Edvard"] },
        { time: "12:35", end: "13:35", activity: "KRLE", teachers: ["Eirik"] },
        { time: "13:35", end: "14:35", activity: "Matematikk 5. / Matematikk 6.", teachers: ["Lis", "Linda"] },
      ],
      Tirsdag: [
        { time: "08:30", end: "09:30", activity: "Musikk", teachers: ["Lars-Ingar"] },
        { time: "09:40", end: "10:40", activity: "Musikk", teachers: ["Lars-Ingar"] },
        { time: "11:25", end: "12:25", activity: "Norsk", teachers: ["Lars-Ingar"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Lars-Ingar"] },
      ],
      Onsdag: [
        { time: "08:30", end: "09:30", activity: "Matematikk", teachers: ["Lars-Ingar"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Lars-Ingar"] },
        { time: "11:25", end: "12:25", activity: "KRLE", teachers: ["Eirik"] },
        { time: "12:35", end: "13:35", activity: "Kroppsøving", teachers: ["Eirik", "Edvard"] },
      ],
      Torsdag: [
        { time: "08:30", end: "09:30", activity: "Samfunnsfag", teachers: ["Lars-Ingar"] },
        { time: "09:40", end: "10:40", activity: "Fysak", teachers: ["Lars-Ingar"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Lars-Ingar"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Lars-Ingar"] },
      ],
      Fredag: [
        { time: "08:30", end: "09:30", activity: "Engelsk", teachers: ["Lars-Ingar"] },
        { time: "09:40", end: "10:40", activity: "Engelsk", teachers: ["Lars-Ingar"] },
        { time: "11:25", end: "12:25", activity: "Naturfag", teachers: ["Linda"] },
        { time: "12:35", end: "13:35", activity: "Samfunnsfag", teachers: ["Lars-Ingar"] },
      ],
    },
  },
  "7.": {
    multiGradeMode: false,
    schedule: {
      Mandag: [
        { time: "08:30", end: "09:30", activity: "Samfunnsfag", teachers: ["Thor"] },
        { time: "09:40", end: "10:40", activity: "Samfunnsfag", teachers: ["Thor"] },
        { time: "11:25", end: "12:25", activity: "Kunst og håndverk", teachers: ["Maria"] },
        { time: "12:35", end: "13:35", activity: "Kunst og håndverk", teachers: ["Maria"] },
        { time: "13:35", end: "14:35", activity: "Matematikk", teachers: ["Thor"] },
      ],
      Tirsdag: [
        { time: "08:30", end: "09:30", activity: "Kroppsøving", teachers: ["Edvard"] },
        { time: "09:40", end: "10:40", activity: "KRLE", teachers: ["Thor"] },
        { time: "11:25", end: "12:25", activity: "Norsk", teachers: ["Thor"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Thor"] },
      ],
      Onsdag: [
        { time: "08:30", end: "09:30", activity: "Matematikk", teachers: ["Thor"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Thor"] },
        { time: "11:25", end: "12:25", activity: "Fysak", teachers: ["Thor"] },
        { time: "12:35", end: "13:35", activity: "Musikk", teachers: ["Lars-Ingar"] },
      ],
      Torsdag: [
        { time: "08:30", end: "09:30", activity: "Engelsk", teachers: ["Lis"] },
        { time: "09:40", end: "10:40", activity: "Engelsk", teachers: ["Lis"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Thor"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Thor"] },
      ],
      Fredag: [
        { time: "08:30", end: "09:30", activity: "KRLE", teachers: ["Thor"] },
        { time: "09:40", end: "10:40", activity: "Naturfag", teachers: ["Thor"] },
        { time: "11:25", end: "12:25", activity: "Kroppsøving", teachers: ["Edvard"] },
        { time: "12:35", end: "13:35", activity: "Naturfag", teachers: ["Thor"] },
      ],
    },
  },
  "8. og 9.": {
    multiGradeMode: true,
    schedule: {
      Mandag: [
        { time: "08:30", end: "09:30", activity: "Norsk", teachers: ["Theodor"] },
        { time: "09:40", end: "10:40", activity: "Kroppsøving 8. / Matematikk 9.", teachers: ["Rune", "Linda"] },
        { time: "11:25", end: "12:25", activity: "Samfunnsfag", teachers: ["Mirjam"] },
        { time: "12:35", end: "13:35", activity: "Engelsk", teachers: ["Rune"] },
        { time: "13:35", end: "14:35", activity: "Engelsk", teachers: ["Rune"] },
      ],
      Tirsdag: [
        { time: "08:30", end: "09:30", activity: "Naturfag", teachers: ["Theodor"] },
        { time: "09:40", end: "10:40", activity: "Matematikk 8. / Kroppsøving 9.", teachers: ["Lindbjørg", "Theodor"] },
        { time: "11:25", end: "12:25", activity: "Kroppsøving 8. / Matematikk 9.", teachers: ["Rune", "Linda"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Theodor"] },
        { time: "13:35", end: "14:35", activity: "Leksehjelp", teachers: ["Jessica"] },
      ],
      Onsdag: [
        { time: "08:30", end: "09:30", activity: "Kunst og håndverk 8. / Mat og helse 9.", teachers: ["Maria", "Lindbjørg"] },
        { time: "09:40", end: "10:40", activity: "Kunst og håndverk 8. / Mat og helse 9.", teachers: ["Maria", "Lindbjørg"] },
        { time: "11:25", end: "12:25", activity: "Musikk", teachers: ["Lars-Ingar"] },
        { time: "12:35", end: "13:35", activity: "Friluftsliv / Design og redesign", parallel: true, teachers: [["Rune", "Andreas"], ["Maria"]] },
        { time: "13:35", end: "14:35", activity: "Friluftsliv / Design og redesign", parallel: true, teachers: [["Rune", "Andreas"], ["Maria"]] },
      ],
      Torsdag: [
        { time: "08:30", end: "09:30", activity: "Matematikk 8. / Matematikk 9.", teachers: ["Lindbjørg", "Linda"] },
        { time: "09:40", end: "10:40", activity: "KRLE", weekParity: "partall", teachers: ["Theodor"] },
        { time: "09:40", end: "10:40", activity: "Utdanningsvalg", weekParity: "oddetall", teachers: ["Thor"] },
        { time: "11:25", end: "12:25", activity: "Samfunnsfag", teachers: ["Mirjam"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Theodor"] },
        { time: "13:35", end: "14:35", activity: "Norsk", teachers: ["Theodor"] },
      ],
      Fredag: [
        { time: "08:30", end: "09:30", activity: "Spansk / Tysk / Arbeidslivsfag", parallel: true, teachers: [["Ana Maria"], ["Barbara"], ["Eirik"]] },
        { time: "09:40", end: "10:40", activity: "Spansk / Tysk / Arbeidslivsfag", parallel: true, teachers: [["Ana Maria"], ["Barbara"], ["Eirik"]] },
        { time: "11:25", end: "12:25", activity: "KRLE", teachers: ["Theodor"] },
        { time: "12:35", end: "13:35", activity: "Matematikk 8. / Kroppsøving 9.", teachers: ["Lindbjørg", "Theodor"] },
        { time: "13:35", end: "14:35", activity: "Naturfag", teachers: ["Theodor"] },
      ],
    },
  },
  "10.": {
    multiGradeMode: false,
    schedule: {
      Mandag: [
        { time: "08:30", end: "09:30", activity: "Norsk", teachers: ["Andreas"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Andreas"] },
        { time: "11:25", end: "12:25", activity: "Engelsk", teachers: ["Rune"] },
        { time: "12:35", end: "13:35", activity: "Samfunnsfag", teachers: ["Andreas"] },
        { time: "13:35", end: "14:35", activity: "Samfunnsfag", teachers: ["Andreas"] },
      ],
      Tirsdag: [
        { time: "08:30", end: "09:30", activity: "Matematikk", teachers: ["Lindbjørg"] },
        { time: "09:40", end: "10:40", activity: "Norsk", teachers: ["Andreas"] },
        { time: "11:25", end: "12:25", activity: "Kunst og håndverk", teachers: ["Maria"] },
        { time: "12:35", end: "13:35", activity: "Kunst og håndverk", teachers: ["Maria"] },
        { time: "13:35", end: "14:35", activity: "Leksehjelp", teachers: ["Jessica"] },
      ],
      Onsdag: [
        { time: "08:30", end: "09:30", activity: "KRLE", teachers: ["Andreas"] },
        { time: "09:40", end: "10:40", activity: "Kroppsøving", teachers: ["Rune"] },
        { time: "11:25", end: "12:25", activity: "Matematikk", teachers: ["Lindbjørg"] },
        { time: "12:35", end: "13:35", activity: "Friluftsliv / Design og redesign", parallel: true, teachers: [["Rune", "Andreas"], ["Maria"]] },
        { time: "13:35", end: "14:35", activity: "Friluftsliv / Design og redesign", parallel: true, teachers: [["Rune", "Andreas"], ["Maria"]] },
      ],
      Torsdag: [
        { time: "08:30", end: "09:30", activity: "Utdanningsvalg", teachers: ["Thor"] },
        { time: "09:40", end: "10:40", activity: "Matematikk", teachers: ["Lindbjørg"] },
        { time: "11:25", end: "12:25", activity: "Engelsk", teachers: ["Rune"] },
        { time: "12:35", end: "13:35", activity: "Norsk", teachers: ["Andreas"] },
        { time: "13:35", end: "14:35", activity: "Kroppsøving", teachers: ["Rune"] },
      ],
      Fredag: [
        { time: "08:30", end: "09:30", activity: "Naturfag", teachers: ["Edvard"] },
        { time: "09:40", end: "10:40", activity: "Naturfag", teachers: ["Edvard"] },
        { time: "11:25", end: "12:25", activity: "Spansk / Tysk / Arbeidslivsfag", parallel: true, teachers: [["Ana Maria"], ["Barbara"], ["Eirik"]] },
        { time: "12:35", end: "13:35", activity: "Spansk / Tysk / Arbeidslivsfag", parallel: true, teachers: [["Ana Maria"], ["Barbara"], ["Eirik"]] },
        { time: "13:35", end: "14:35", activity: "KRLE", teachers: ["Andreas"] },
      ],
    },
  },
};

/**
 * Ferier og andre fridager for elevene i skoleåret, fra skolens skolerute.
 * Brukes til bursdagene: en bursdag i en ferie vises siste skoledag før og
 * første skoledag etter. Helger og helligdager (påske, 1. og 17. mai,
 * Kristi himmelfart, 2. pinsedag, jul og nyttår) regnes ut av seg selv.
 * Format: { navn, fra: 'ÅÅÅÅ-MM-DD', til: 'ÅÅÅÅ-MM-DD' }, begge dager med.
 *
 * Torderød følger skoleruta til Moss kommune (moss.kommune.no, skolerute 2026–2027).
 * Plandager er fri for elevene. Legg inn neste skoleår når ruta for 2027/28 kommer:
 * sommerferien under slutter skjønnsmessig 15. august 2027.
 */
export const TORDEROD_FERIER = [
  // Skoleåret 2026/27
  { navn: 'Plandager før skolestart', fra: '2026-08-11', til: '2026-08-14' },
  { navn: 'Høstferie', fra: '2026-09-28', til: '2026-10-02' },
  { navn: 'Plandag', fra: '2026-11-19', til: '2026-11-19' },
  { navn: 'Juleferie', fra: '2026-12-19', til: '2027-01-03' },
  { navn: 'Vinterferie', fra: '2027-02-22', til: '2027-02-26' },
  { navn: 'Påskeferie', fra: '2027-03-22', til: '2027-03-29' },
  { navn: 'Plandag og sommerferie', fra: '2027-06-18', til: '2027-08-15' },
];
