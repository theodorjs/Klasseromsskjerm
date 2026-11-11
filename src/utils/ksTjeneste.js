/**
 * Skolens egen tjeneste for Feide-innlogging og bursdager (Torderød: ks-data.torderod.no).
 *
 * Tjenesten setter en HttpOnly-kapsel ved innlogging; Klasseskjerm kan ikke lese
 * den, bare sende den med (credentials: 'include'). /api/meg sier om man er logget inn.
 * Feil fra tjenesten (nede, 5xx, nettverk) skal aldri stoppe Klasseskjerm: da brukes
 * siste lagrede bursdagsliste, og appen virker som før.
 */
import { aktivSkole } from '../data/skoletema.js';
import { safeGetItem, safeSetItem, safeRemoveItem } from './storage.js';

const BURSDAG_KEY = 'klasseskjerm.bursdager';
/** Sprukne ballonger i dag (inneholder fornavn, så den slettes sammen med lista). */
export const SPRUKKET_KEY = 'klasseskjerm.bursdagSprukket';
const INNLOGGET_KEY = 'klasseskjerm.innlogget';
/** Eleven har valgt å bruke Klasseskjerm uten å logge inn (huskes i nettleseren). */
const ELEV_KEY = 'klasseskjerm.elev';
const DOGN_MS = 24 * 60 * 60 * 1000;
const TIDSFRIST_MS = 8000;

/** Tjenesten for skolen siden vises hos, eller null (andre skoler, github.io, forhåndsvisning). */
export function skoleTjeneste(skole = aktivSkole(), opprinnelse = globalThis.location?.origin) {
  if (!skole?.tjeneste) return null;
  // Bare under utvikling: ?tjeneste=lokal later som siden er på skolens adresse
  if (import.meta.env?.DEV && new URLSearchParams(globalThis.location?.search).get('tjeneste') === 'lokal') {
    return skole.tjeneste.replace(/\/+$/, '');
  }
  if (!(skole.opprinnelser || []).includes(opprinnelse)) return null;
  return skole.tjeneste.replace(/\/+$/, '');
}

// Tilbake til nøyaktig samme adresse: med og uten «www.» er to ulike opphav med
// hver sin lagring, så læreren må lande der timeplanene ligger
export function innloggingsadresse(tjeneste, tilbake = globalThis.location?.href) {
  return `${tjeneste}/innlogging?tilbake=${encodeURIComponent(tilbake)}`;
}

export function utloggingsadresse(tjeneste, tilbake = globalThis.location?.href) {
  return `${tjeneste}/utlogging?tilbake=${encodeURIComponent(tilbake)}`;
}

async function hent(url) {
  const kontroll = typeof AbortController === 'function' ? new AbortController() : null;
  const tidsfrist = kontroll ? setTimeout(() => kontroll.abort(), TIDSFRIST_MS) : null;
  try {
    return await fetch(url, { credentials: 'include', cache: 'no-store', signal: kontroll?.signal });
  } finally {
    if (tidsfrist) clearTimeout(tidsfrist);
  }
}

/** Huskes for å slippe et tomt skjermbilde ved oppstart: sist kjente svar fra /api/meg. */
export function varInnlogget() {
  return safeGetItem(INNLOGGET_KEY) === '1';
}

/**
 * Elevene bruker Klasseskjerm uten innlogging: dagen sin, nedtelleren og resten
 * av verktøyene. De får aldri bursdagene (tjenesten gir dem bare til ansatte),
 * og tjenesten blir ikke spurt, så en elev sendes aldri til Feide-siden.
 */
export function erElev() {
  return safeGetItem(ELEV_KEY) === '1';
}

export function velgElev() {
  glemLokalt();
  safeSetItem(ELEV_KEY, '1');
  sett({ elev: true, utlogget: false });
}

/** Før en lærer logger inn: ellers slipper elevvalget læreren forbi innloggingen. */
export function forlatElev() {
  safeRemoveItem(ELEV_KEY);
  sett({ elev: false });
}

/** Om læreren kan se bursdagslista: skolens egen adresse, og ikke i elevmodus. */
export function kanSeBursdager() {
  return !!skoleTjeneste() && !tilstand.elev;
}

/** Glemmer innloggingen og bursdagslista i denne nettleseren (utlogget eller kapselen er ugyldig). */
export function glemLokalt() {
  safeRemoveItem(INNLOGGET_KEY);
  safeRemoveItem(BURSDAG_KEY);
  safeRemoveItem(SPRUKKET_KEY);
  sett({ bursdager: null });
}

/**
 * Sjekker innloggingen. Svarer 'inne' (med navn), 'ute' (401) eller 'feil'
 * (tjenesten svarer ikke som avtalt; da skal ingenting stoppe).
 */
export async function sjekkInnlogging(tjeneste) {
  try {
    const svar = await hent(`${tjeneste}/api/meg`);
    if (svar.status === 401) {
      glemLokalt();
      return { status: 'ute' };
    }
    if (!svar.ok) return { status: 'feil' };
    const data = await svar.json().catch(() => null);
    if (!data?.innlogget) return { status: 'feil' };
    safeSetItem(INNLOGGET_KEY, '1');
    sett({ navn: typeof data.navn === 'string' ? data.navn : '' });
    return { status: 'inne', navn: data.navn || '' };
  } catch {
    return { status: 'feil' };
  }
}

function gyldigListe(data) {
  return !!data && typeof data === 'object' && data.klasser && typeof data.klasser === 'object' && !Array.isArray(data.klasser);
}

/** Lagret bursdagsliste: { hentet: ms, data } eller null. */
export function lagretBursdagsliste() {
  try {
    const lagret = JSON.parse(safeGetItem(BURSDAG_KEY) || 'null');
    return lagret && gyldigListe(lagret.data) ? lagret : null;
  } catch {
    return null;
  }
}

/**
 * Henter bursdagene for alle klassene og lagrer dem med tidspunkt.
 * Svarer true når lista ble oppdatert. Ved 401 er man logget ut, og appen
 * sendes til innloggingen.
 */
export async function hentBursdager(tjeneste) {
  try {
    const svar = await hent(`${tjeneste}/api/bursdager`);
    if (svar.status === 401) {
      glemLokalt();
      sett({ utlogget: true });
      return false;
    }
    if (!svar.ok) return false;
    const data = await svar.json().catch(() => null);
    if (!gyldigListe(data)) return false;
    const lagret = { hentet: Date.now(), data };
    safeSetItem(BURSDAG_KEY, JSON.stringify(lagret));
    sett({ bursdager: lagret });
    return true;
  } catch {
    return false;
  }
}

/** Henter på nytt når det er mer enn et døgn siden sist (eller aldri hentet). */
export function trengerNyListe(lagret = lagretBursdagsliste(), naa = Date.now()) {
  return !lagret || !(naa - lagret.hentet < DOGN_MS);
}

// ── Lite felles lager, så bursdagsvisningen og «Om»-dialogen ser det samme ──
let tilstand = { navn: '', bursdager: null, utlogget: false, elev: erElev() };
const lyttere = new Set();

function sett(endring) {
  tilstand = { ...tilstand, ...endring };
  lyttere.forEach(l => l());
}

export function lesTjenesteTilstand() {
  return tilstand;
}

export function lyttTilTjeneste(lytter) {
  lyttere.add(lytter);
  return () => lyttere.delete(lytter);
}

export function startTjenesteTilstand() {
  if (tilstand.bursdager == null) sett({ bursdager: lagretBursdagsliste() });
}
