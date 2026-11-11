/**
 * Hvilke bursdager skal vises på en gitt skoledag?
 *
 * - Bursdag på en skoledag: vises den dagen.
 * - Bursdag på en fridag (helg, helligdag eller ferie): vises siste skoledag
 *   før og første skoledag etter, så eleven blir feiret uansett.
 * - 29. februar vises 28. februar i år uten skuddag.
 *
 * Datoer regnes som kalenderdager uten klokkeslett (år, måned 1–12, dag),
 * så sommertid og tidssoner ikke kan flytte en bursdag.
 */

const MS_DAG = 86400000;

/** Kalenderdag som tall (dager siden 1970), uavhengig av tidssone. */
export function dagnr(aar, maned, dag) {
  return Math.round(Date.UTC(aar, maned - 1, dag) / MS_DAG);
}

function fraDagnr(n) {
  const d = new Date(n * MS_DAG);
  return { aar: d.getUTCFullYear(), maned: d.getUTCMonth() + 1, dag: d.getUTCDate(), ukedag: d.getUTCDay() };
}

/** Dagens dato i Oslo, uansett hvilken tidssone maskinen står i. */
let osloFormat = null;
export function osloIDag(naa = new Date()) {
  try {
    // Lages én gang: appen spør hvert sekund
    osloFormat ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const deler = osloFormat
      .formatToParts(naa)
      .reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
    return dagnr(Number(deler.year), Number(deler.month), Number(deler.day));
  } catch {
    return dagnr(naa.getFullYear(), naa.getMonth() + 1, naa.getDate());
  }
}

const erSkuddaar = aar => (aar % 4 === 0 && aar % 100 !== 0) || aar % 400 === 0;

/** Første påskedag (gregoriansk, Meeus/Jones/Butcher). */
function paaskedag(aar) {
  const a = aar % 19, b = Math.floor(aar / 100), c = aar % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maned = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;
  return dagnr(aar, maned, dag);
}

const helligdagCache = new Map();
/** Norske helligdager og 1. og 17. mai som faller på hverdager, som et sett med dagnr. */
export function helligdager(aar) {
  if (helligdagCache.has(aar)) return helligdagCache.get(aar);
  const p = paaskedag(aar);
  const sett = new Set([
    dagnr(aar, 1, 1),
    p - 3, p - 2, p + 1, // skjærtorsdag, langfredag, 2. påskedag
    dagnr(aar, 5, 1), dagnr(aar, 5, 17),
    p + 39, p + 50, // Kristi himmelfartsdag, 2. pinsedag
    dagnr(aar, 12, 25), dagnr(aar, 12, 26),
  ]);
  helligdagCache.set(aar, sett);
  return sett;
}

/** «2026-12-21» → dagnr, eller null. */
function lesDato(tekst) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tekst || ''));
  return m ? dagnr(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

/**
 * Lager en funksjon som svarer på om en dag er fri.
 * `ferier` er skolens ferier og fridager: [{ fra: 'ÅÅÅÅ-MM-DD', til: 'ÅÅÅÅ-MM-DD' }], begge dager med.
 */
export function lagErFridag(ferier = []) {
  const perioder = ferier
    .map(f => [lesDato(f.fra), lesDato(f.til ?? f.fra)])
    .filter(([a, b]) => a != null && b != null && a <= b);
  return n => {
    const { aar, ukedag } = fraDagnr(n);
    if (ukedag === 0 || ukedag === 6) return true;
    if (helligdager(aar).has(n)) return true;
    return perioder.some(([a, b]) => n >= a && n <= b);
  };
}

/** Bursdagen et gitt år; 29. februar blir 28. februar i år uten skuddag. */
function bursdagI(aar, maned, dag) {
  if (maned === 2 && dag === 29 && !erSkuddaar(aar)) return dagnr(aar, 2, 28);
  return dagnr(aar, maned, dag);
}

// Lengste fri vi leter gjennom (sommerferien er rundt åtte uker)
const MAKS_FRI = 120;

function forrigeSkoledag(n, erFridag) {
  for (let i = 1; i <= MAKS_FRI; i++) if (!erFridag(n - i)) return n - i;
  return null;
}
function nesteSkoledag(n, erFridag) {
  for (let i = 1; i <= MAKS_FRI; i++) if (!erFridag(n + i)) return n + i;
  return null;
}

const UKEDAGER = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MANEDER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

/** Når bursdagen er, sett fra i dag: «i dag», «i morgen», «på lørdag», «12. juli». */
export function narTekst(bursdag, idag) {
  const diff = bursdag - idag;
  if (diff === 0) return 'i dag';
  if (diff === 1) return 'i morgen';
  if (diff === -1) return 'i går';
  const { maned, dag, ukedag } = fraDagnr(bursdag);
  if (Math.abs(diff) < 7) return `på ${UKEDAGER[ukedag]}`;
  return `${dag}. ${MANEDER[maned - 1]}`;
}

/**
 * Elevene som skal feires på dagen `idag` (dagnr).
 * `elever`: [{ fornavn, dag, maned }]. Svarer med
 * [{ fornavn, bursdag, nar, tid: 'i-dag' | 'snart' | 'var' }], sortert etter bursdag.
 */
export function bursdagerPaaDag(elever, idag, erFridag) {
  if (!Array.isArray(elever) || !elever.length) return [];
  const { aar } = fraDagnr(idag);
  const iDagFri = erFridag(idag);
  const ut = [];
  for (const elev of elever) {
    const maned = Number(elev?.maned), dag = Number(elev?.dag);
    const fornavn = String(elev?.fornavn || '').trim();
    if (!fornavn || !(maned >= 1 && maned <= 12) || !(dag >= 1 && dag <= 31)) continue;
    // Forrige, i år og neste år: juleferien går over nyttår
    for (const a of [aar - 1, aar, aar + 1]) {
      const b = bursdagI(a, maned, dag);
      let vis = b === idag;
      if (!vis && !iDagFri && erFridag(b) && Math.abs(b - idag) <= MAKS_FRI) {
        vis = forrigeSkoledag(b, erFridag) === idag || nesteSkoledag(b, erFridag) === idag;
      }
      if (vis) {
        ut.push({ fornavn, bursdag: b, nar: narTekst(b, idag), tid: b === idag ? 'i-dag' : b > idag ? 'snart' : 'var' });
        break;
      }
    }
  }
  return ut.sort((x, y) => x.bursdag - y.bursdag || x.fornavn.localeCompare(y.fornavn, 'nb'));
}

/** Undertekst under navnet: «Gratulerer med dagen!», «Bursdag på lørdag», «Hadde bursdag i går». */
export function bursdagUndertekst(b) {
  if (b.tid === 'i-dag') return 'Gratulerer med dagen!';
  return b.tid === 'var' ? `Hadde bursdag ${b.nar}` : `Bursdag ${b.nar}`;
}

/** Hel setning rundt navnet, som [foran, etter]: «Gratulerer med dagen, | Noah | !». */
export function bursdagSetning(b) {
  if (b.tid === 'i-dag') return ['Gratulerer med dagen, ', '!'];
  return ['', b.tid === 'var' ? ` hadde bursdag ${b.nar}` : ` har bursdag ${b.nar}`];
}
