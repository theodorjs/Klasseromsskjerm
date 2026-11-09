/* Symboler for fag og gjøremål.
 *
 * Fag og gjøremål lagrer en symbolnøkkel (f.eks. «microscope») i det gamle
 * emoji-feltet. Eldre data og delingslenker kan fortsatt inneholde emoji:
 * de oversettes her til nærmeste ikon. En emoji vi ikke kjenner, vises som
 * tekst slik den alltid har gjort, så ingen lagrede data går tapt. */

import { TEGNINGER } from './tegninger.js';

/** Utvalget i symbolvelgeren: [nøkkel, navn som leses opp]. */
export const SYMBOLVALG = [
  ['book-open', 'Bok'], ['book-open-text', 'Lesing'], ['library', 'Bøker'], ['pen-line', 'Skriving'],
  ['pencil', 'Blyant'], ['notebook', 'Skrivebok'], ['languages', 'Språk'], ['message-circle', 'Samtale'],
  ['mic', 'Muntlig'], ['flag', 'Flagg'],
  ['calculator', 'Kalkulator'], ['sigma', 'Matte'], ['shapes', 'Former'], ['ruler', 'Linjal'],
  ['drafting-compass', 'Passer'], ['chart-column', 'Diagram'],
  ['microscope', 'Mikroskop'], ['flask-conical', 'Forsøk'], ['atom', 'Atom'], ['dna', 'DNA'],
  ['leaf', 'Natur'], ['globe', 'Verden'], ['map', 'Kart'], ['compass', 'Kompass'], ['scroll', 'Historie'],
  ['church', 'Kirke'], ['sparkles', 'Gnist'],
  ['palette', 'Kunst'], ['brush', 'Pensel'], ['drama', 'Drama'], ['music', 'Musikk'], ['guitar', 'Gitar'],
  ['clapperboard', 'Film'], ['camera', 'Foto'],
  ['laptop', 'Datamaskin'], ['keyboard', 'Tastatur'], ['presentation', 'Presentasjon'],
  ['lightbulb', 'Idé'], ['puzzle', 'Oppgave'], ['brain', 'Tenking'], ['target', 'Mål'],
  ['volleyball', 'Ball'], ['dumbbell', 'Trening'], ['bike', 'Sykkel'], ['footprints', 'Gåtur'],
  ['person-standing', 'Bevegelse'], ['heart-pulse', 'Helse'], ['flower', 'Ro'],
  ['users', 'Gruppe'], ['handshake', 'Samarbeid'], ['megaphone', 'Beskjed'], ['clipboard-list', 'Liste'],
  ['square-check', 'Ferdig'], ['pin', 'Viktig'], ['folder', 'Mappe'], ['backpack', 'Sekk'],
  ['school', 'Skole'], ['graduation-cap', 'Utdanning'], ['elev', 'Elev'],
  ['sandwich', 'Matpakke'], ['apple', 'Frukt'], ['milk', 'Melk'], ['coffee', 'Kaffe'],
  ['chef-hat', 'Matlaging'], ['cooking-pot', 'Gryte'], ['utensils', 'Måltid'],
  ['hammer', 'Verktøy'], ['stige', 'Stige'], ['wrench', 'Skiftenøkkel'], ['briefcase', 'Arbeid'], ['rocket', 'Rakett'],
  ['star', 'Stjerne'], ['trophy', 'Premie'], ['party-popper', 'Feiring'], ['cake', 'Bursdag'],
  ['smile', 'Smil'], ['pause', 'Pause'], ['sun', 'Sol'], ['tent-tree', 'Ute'], ['bus', 'Tur'],
];

const NAVN = Object.fromEntries(SYMBOLVALG);

/** Emoji fra tidligere versjoner → symbolnøkkel. Variantvelgeren U+FE0F fjernes før oppslag. */
const FRA_EMOJI = {
  '📚': 'library', '📖': 'book-open', '📝': 'pen-line', '✏': 'pencil', '🧠': 'brain', '🏫': 'school',
  '👩‍🏫': 'presentation', '👨‍🏫': 'presentation', '🎒': 'backpack', '📓': 'notebook',
  '📐': 'drafting-compass', '📏': 'ruler', '🔢': 'calculator', '➗': 'sigma', '🧮': 'calculator',
  '🔬': 'microscope', '🧪': 'flask-conical', '🧬': 'dna', '🌍': 'globe', '🌎': 'globe', '🌏': 'globe',
  '🗺': 'map', '🎨': 'palette', '🖌': 'brush', '🎭': 'drama', '🎶': 'music', '🎵': 'music',
  '💻': 'laptop', '⌨': 'keyboard', '🖥': 'laptop', '📊': 'chart-column', '📌': 'pin', '✅': 'square-check',
  '📋': 'clipboard-list', '🗂': 'folder', '🗣': 'mic', '🇳🇴': 'flag', '🇬🇧': 'languages', '📣': 'megaphone',
  '🤝': 'handshake', '👥': 'users', '🧩': 'puzzle', '🧘': 'flower', '🏃‍♂': 'footprints', '🏃‍♀': 'footprints',
  '🏃': 'footprints', '⚽': 'volleyball', '🥪': 'sandwich', '🍎': 'apple', '🥛': 'milk', '☕': 'coffee',
  '💼': 'briefcase', '🛠': 'hammer', '🌮': 'utensils', '✝': 'church', '⏸': 'pause', '🎬': 'clapperboard',
  '🌟': 'star', '⭐': 'star', '🪐': 'atom', '🚀': 'rocket', '🛰': 'rocket', '✨': 'sparkles', '🎯': 'target',
  '💬': 'message-circle', '🍳': 'chef-hat', '🧭': 'compass', '🤸': 'person-standing', '😊': 'smile',
  '🥘': 'cooking-pot', '🍲': 'cooking-pot', '🧑‍🎓': 'elev', '👨‍🎓': 'elev', '👩‍🎓': 'elev', '🎓': 'graduation-cap',
  '🪜': 'stige',
};

/** Gjør en lagret verdi (nøkkel eller gammel emoji) om til en symbolnøkkel, eller null. */
export function tilSymbolnokkel(verdi) {
  if (!verdi) return null;
  const v = String(verdi).trim();
  if (TEGNINGER[v]) return v;
  return FRA_EMOJI[v.replace(/️/g, '')] || null;
}

/** Som tilSymbolnokkel, men lar ukjent tekst stå urørt. Brukes når data lastes inn. */
export function normaliserSymbol(verdi) {
  return tilSymbolnokkel(verdi) || verdi;
}

/** Navnet på et symbol til skjermlesere, eller tom streng. */
export function symbolnavn(verdi) {
  const n = tilSymbolnokkel(verdi);
  return (n && NAVN[n]) || '';
}
