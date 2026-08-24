export const SCHOOL_DAY_FRAMES = [
  { key: 'lesson-1', type: 'lesson', start: '08:30', end: '09:30', label: '1. time' },
  { key: 'pause-1', type: 'break', start: '09:30', end: '09:40', activity: 'Pause', label: 'Lillefri' },
  { key: 'lesson-2', type: 'lesson', start: '09:40', end: '10:40', label: '2. time' },
  { key: 'mat', type: 'break', start: '10:40', end: '11:00', activity: 'Mat', label: 'Lunsj' },
  { key: 'storefri', type: 'break', start: '11:00', end: '11:25', activity: 'Storefri', label: 'Storefri' },
  { key: 'lesson-3', type: 'lesson', start: '11:25', end: '12:25', label: '3. time' },
  { key: 'pause-2', type: 'break', start: '12:25', end: '12:35', activity: 'Pause', label: 'Lillefri' },
  { key: 'lesson-4', type: 'lesson', start: '12:35', end: '13:35', label: '4. time' },
  { key: 'lesson-5', type: 'lesson', start: '13:35', end: '14:35', label: '5. time' }
];

export const SCHOOL_MAIN_TIMES = SCHOOL_DAY_FRAMES
  .filter(frame => frame.type === 'lesson')
  .map(frame => ({ start: frame.start, end: frame.end }));

const STANDARD_BREAKS = [
  { time: "09:30", end: "09:40", activity: "Pause" },
  { time: "10:40", end: "11:00", activity: "Mat" },
  { time: "11:00", end: "11:25", activity: "Storefri" },
  { time: "12:25", end: "12:35", activity: "Pause" }
];

const cloneBreaks = () => JSON.parse(JSON.stringify(STANDARD_BREAKS));

/**
 * Standardtimeplan for «8. og 9.» (fådelt klasse).
 * Delte økter lagres med trinn-suffiks ("Kroppsøving 8. / Matematikk 9.").
 * Ukeveksling: to oppføringer på samme tid med weekParity.
 * Parallelle fag: én oppføring med parallel-flagg.
 */
export const defaultClassTemplate = {
  teacher: "Mathias",
  name: "8. og 9.",
  multiGradeMode: true,
  multiGradeLabels: ["8.", "9."],
  schedule: {
    "Mandag": [
      { time: "08:30", end: "09:30", activity: "Norsk" },
      { time: "09:40", end: "10:40", activity: "Kroppsøving 8. / Matematikk 9." },
      { time: "11:25", end: "12:25", activity: "Samfunnsfag" },
      { time: "12:35", end: "13:35", activity: "Engelsk" },
      { time: "13:35", end: "14:35", activity: "Engelsk" }
    ],
    "Tirsdag": [
      { time: "08:30", end: "09:30", activity: "Naturfag" },
      { time: "09:40", end: "10:40", activity: "Matematikk 8. / Kroppsøving 9." },
      { time: "11:25", end: "12:25", activity: "Kroppsøving 8. / Matematikk 9." },
      { time: "12:35", end: "13:35", activity: "Norsk" },
      { time: "13:35", end: "14:35", activity: "Leksehjelp" }
    ],
    "Onsdag": [
      { time: "08:30", end: "09:30", activity: "Kunst og håndverk 8. / Mat og helse 9." },
      { time: "09:40", end: "10:40", activity: "Kunst og håndverk 8. / Mat og helse 9." },
      { time: "11:25", end: "12:25", activity: "Musikk" },
      { time: "12:35", end: "13:35", activity: "Valgfag" },
      { time: "13:35", end: "14:35", activity: "Valgfag" }
    ],
    "Torsdag": [
      { time: "08:30", end: "09:30", activity: "Matematikk" },
      { time: "09:40", end: "10:40", activity: "KRLE", weekParity: "partall" },
      { time: "09:40", end: "10:40", activity: "Utdanningsvalg", weekParity: "oddetall" },
      { time: "11:25", end: "12:25", activity: "Samfunnsfag" },
      { time: "12:35", end: "13:35", activity: "Norsk" },
      { time: "13:35", end: "14:35", activity: "Norsk" }
    ],
    "Fredag": [
      { time: "08:30", end: "09:30", activity: "Språkfag / Arbeidslivsfag", parallel: true },
      { time: "09:40", end: "10:40", activity: "Språkfag / Arbeidslivsfag", parallel: true },
      { time: "11:25", end: "12:25", activity: "KRLE" },
      { time: "12:35", end: "13:35", activity: "Matematikk 8. / Kroppsøving 9." },
      { time: "13:35", end: "14:35", activity: "Naturfag" }
    ]
  },
  mainTimes: JSON.parse(JSON.stringify(SCHOOL_MAIN_TIMES)),
  breaks: {
    "Mandag": cloneBreaks(),
    "Tirsdag": cloneBreaks(),
    "Onsdag": cloneBreaks(),
    "Torsdag": cloneBreaks(),
    "Fredag": cloneBreaks()
  },
  agendas: {},
  templates: {},
  subjectColors: {
    "Norsk": "#EE4C17",
    "Matematikk": "#1384CF",
    "Engelsk": "#FF772E",
    "Naturfag": "#1A963B",
    "Samfunnsfag": "#E59C1F",
    "KRLE": "#AA3AB8",
    "Kunst og håndverk": "#9933FF",
    "Musikk": "#C63398",
    "Kroppsøving": "#00CC00",
    "Valgfag": "#7E2EAA",
    "Leksehjelp": "#0A8F7A",
    "Språkfag": "#F08A24",
    "Mat og helse": "#FF3300",
    "Utdanningsvalg": "#3B7EA6",
    "Arbeidslivsfag": "#5E35B1"
  },
  subjectEmojis: {
    "Norsk": "📝",
    "Matematikk": "🔢",
    "Engelsk": "🌍",
    "Naturfag": "🔬",
    "Samfunnsfag": "🗺️",
    "KRLE": "✨",
    "Kunst og håndverk": "🎨",
    "Musikk": "🎵",
    "Kroppsøving": "⚽",
    "Valgfag": "🎯",
    "Leksehjelp": "📚",
    "Språkfag": "💬",
    "Mat og helse": "🍳",
    "Utdanningsvalg": "🧭",
    "Arbeidslivsfag": "🛠️"
  },
  customCountdowns: [],
  countdownsVisible: true
};

/** Navnet nye installasjoner starter med */
export const DEFAULT_CLASS_NAME = "8. og 9.";

export const defaultClasses = { Standard: defaultClassTemplate };

export function cloneDefaultClass() {
  return JSON.parse(JSON.stringify(defaultClassTemplate));
}

export const subjectMap = {
  "Andakt": { full: "Andakt", short: "Andakt", emoji: "✝️" },
  "Matematikk": { full: "Matematikk", short: "Matte", emoji: "🔢" },
  "Norsk": { full: "Norsk", short: "No", emoji: "🇳🇴" },
  "KRLE": { full: "KRLE", short: "KRLE", emoji: "❤️" },
  "Naturfag": { full: "Naturfag", short: "Natur", emoji: "🔬" },
  "Fysak": { full: "Fysak", short: "Fys", emoji: "🤸‍♂️" },
  "Fys.ak.": { full: "Fys.ak.", short: "Fys.ak.", emoji: "🤸‍♂️" },
  "Gym": { full: "Gym", short: "Gym", emoji: "🏃‍♀️" },
  "Kroppsøving": { full: "Kroppsøving", short: "Kroppsøving", emoji: "🏃‍♀️" },
  "Musikk": { full: "Musikk", short: "Musikk", emoji: "🎶" },
  "Engelsk": { full: "Engelsk", short: "En", emoji: "🇬🇧" },
  "Språkfag": { full: "Språkfag", short: "Språk", emoji: "🗣️" },
  "Samfunnsfag": { full: "Samfunnsfag", short: "Samf", emoji: "🌍" },
  "Folkhelse & livsmestring": { full: "Folkhelse & livsmestring", short: "F.H.L.M", emoji: "🧠❤️" },
  "Utdanningsvalg": { full: "Utdanningsvalg", short: "UDV", emoji: "🧭" },
  "Valgfag": { full: "Valgfag", short: "Valg", emoji: "✨" },
  "Leksehjelp": { full: "Leksehjelp", short: "Leksehjelp", emoji: "📚" },
  "Kunst og håndverk": { full: "Kunst og håndverk", short: "K&H", emoji: "🎨" },
  "Kunst og håndtverk": { full: "Kunst og håndtverk", short: "K&H", emoji: "🎨" },
  "Mat og helse": { full: "Mat og helse", short: "M&H", emoji: "🌮" },
  "Pause": { full: "Pause", short: "Pause", emoji: "⏸️" },
  "Mat": { full: "Mat", short: "Mat", emoji: "🥪" },
  "Storefri": { full: "Storefri", short: "Storefri", emoji: "😊" }
};

export const colorMap = {
  "Andakt": "#7D308E",
  "KRLE": "#AA3AB8",
  "Norsk": "#EE4C17",
  "Naturfag": "#1A963B",
  "Matematikk": "#1384CF",
  "Musikk": "#C63398",
  "Engelsk": "#FF772E",
  "Kroppsøving": "#00CC00",
  "Språkfag": "#F08A24",
  "Samfunnsfag": "#E59C1F",
  "Folkhelse & livsmestring": "#CC3399",
  "Utdanningsvalg": "#3B7EA6",
  "Valgfag": "#7E2EAA",
  "Leksehjelp": "#0A8F7A",
  "Kunst og håndverk": "#9933FF",
  "Gym": "#00CC00",
  "Fysak": "#76D3A9",
  "Fys.ak.": "#76D3A9",
  "Mat og helse": "#FF3300",
  "Kunst og håndtverk": "#9933FF",
  "Pause": "#545454",
  "Mat": "#262626",
  "Storefri": "#2E2E2E",
  "Arbeidslivsfag": "#5E35B1"
};

export const LOWER_GRADE_STANDARD_COLORS = {
  "Mat": "#262626",
  "Pause": "#545454",
  "Storefri": "#2E2E2E",
  "Norsk": "#EE4C17",
  "Naturfag": "#1A963B",
  "Samfunnsfag": "#E59C1F",
  "Matematikk": "#1384CF",
  "Musikk": "#C63398",
  "Engelsk": "#FF772E"
};
