/**
 * Fagfarger og fag-emoji: den ENESTE kilden i appen.
 *
 * Fasit på tvers av prosjektene ligger i
 * «Mine designprinsipper/fagfarger.md». Endre der først, så her.
 * Alt annet (colorMap, subjectMap, standardklassen, timeplaneditoren)
 * utledes fra listene nedenfor, så en farge skal aldri skrives inn to steder.
 *
 * aliases: andre skrivemåter som finnes i eldre lagrede timeplaner.
 */
export const SUBJECTS = [
  { name: "Norsk",                    short: "No",          color: "#EE4C17", emoji: "📝" },
  { name: "Matematikk",               short: "Matte",       color: "#1384CF", emoji: "🔢" },
  { name: "Engelsk",                  short: "En",          color: "#FF772E", emoji: "🌍" },
  { name: "Naturfag",                 short: "Natur",       color: "#1A963B", emoji: "🔬" },
  { name: "Samfunnsfag",              short: "Samf",        color: "#E59C1F", emoji: "🗺️" },
  { name: "KRLE",                     short: "KRLE",        color: "#AA3AB8", emoji: "✨" },
  { name: "Kunst og håndverk",        short: "K&H",         color: "#9933FF", emoji: "🎨", aliases: ["Kunst og håndtverk"] },
  { name: "Musikk",                   short: "Musikk",      color: "#C63398", emoji: "🎵" },
  { name: "Kroppsøving",              short: "Kroppsøving", color: "#00CC00", emoji: "⚽", aliases: ["Gym"] },
  { name: "Valgfag",                  short: "Valg",        color: "#7E2EAA", emoji: "🎯" },
  { name: "Leksehjelp",               short: "Leksehjelp",  color: "#0A8F7A", emoji: "📚" },
  { name: "Språkfag",                 short: "Språk",       color: "#F08A24", emoji: "💬" },
  { name: "Mat og helse",             short: "M&H",         color: "#FF3300", emoji: "🍳" },
  { name: "Utdanningsvalg",           short: "UDV",         color: "#3B7EA6", emoji: "🧭" },
  { name: "Arbeidslivsfag",           short: "Arbeidsliv",  color: "#5E35B1", emoji: "🛠️" },
  { name: "Andakt",                   short: "Andakt",      color: "#7D308E", emoji: "✝️" },
  { name: "Folkhelse & livsmestring", short: "F.H.L.M",     color: "#CC3399", emoji: "🧠", aliases: ["Folkehelse og livsmestring"] },
  { name: "Fysak",                    short: "Fys",         color: "#76D3A9", emoji: "🤸", aliases: ["Fys.ak."] },
];

/** Pauser: mørkegrå, så de trer tilbake bak fagene. */
export const BREAK_SUBJECTS = [
  { name: "Pause",    short: "Pause",    color: "#545454", emoji: "⏸️" },
  { name: "Mat",      short: "Mat",      color: "#262626", emoji: "🥪" },
  { name: "Storefri", short: "Storefri", color: "#2E2E2E", emoji: "😊" },
];

const ALL = [...SUBJECTS, ...BREAK_SUBJECTS];

/** Navn og alle alias, med fagets data. */
function* entriesWithAliases() {
  for (const subject of ALL) {
    yield [subject.name, subject, subject.short];
    for (const alias of subject.aliases || []) yield [alias, subject, alias];
  }
}

/** Fag eller pause etter navn (også alias). */
export function getSubject(name) {
  for (const [key, subject] of entriesWithAliases()) {
    if (key === name) return subject;
  }
  return null;
}

/** { navn: farge } for et utvalg fag. Ukjente navn hoppes over. */
export function pickSubjectColors(names) {
  return Object.fromEntries(names.map(n => [n, getSubject(n)?.color]).filter(([, c]) => c));
}

/** { navn: emoji } for et utvalg fag. Ukjente navn hoppes over. */
export function pickSubjectEmojis(names) {
  return Object.fromEntries(names.map(n => [n, getSubject(n)?.emoji]).filter(([, e]) => e));
}

/** { navn: farge }, inkludert alias og pauser. */
export const colorMap = Object.fromEntries(
  [...entriesWithAliases()].map(([key, subject]) => [key, subject.color])
);

/** { navn: { full, short, emoji } }, inkludert alias og pauser. */
export const subjectMap = Object.fromEntries(
  [...entriesWithAliases()].map(([key, subject, short]) => [
    key,
    { full: key, short, emoji: subject.emoji },
  ])
);
