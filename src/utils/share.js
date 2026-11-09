/**
 * Deling av en klasses timeplan via lenke (uten backend).
 *
 * Hele oppsettet til én klasse pakkes som JSON, komprimeres (deflate) og
 * legges base64url-kodet i URL-ens #-del:  …/Klasseskjerm/#del=1.<token>
 *
 * #-delen sendes aldri til serveren, så ingen data forlater enheten før
 * mottakeren selv velger «Legg til». Payloaden inneholder bare timeplan,
 * pauser, fagfarger og emoji – aldri agenda, notater eller nedtellinger.
 *
 * Formatet er versjonert (v) slik at det senere kan brukes uendret mot en
 * skytjeneste (PRD Fase 1).
 */
import { deflateSync, Inflate, strToU8, strFromU8 } from 'fflate';
import { cloneDefaultClass } from '../data/constants.js';
import { getSubject } from '../data/subjects.js';
import {
  ensureClassData,
  extractGradesFromName,
  getDefaultMultiGradeLabels,
  getActivitySubjectParts,
  canonicalizeSubjectName,
} from './schedule.js';
import { getMinutesFromTime, formatMinutesAsTime } from './time.js';

export const SHARE_VERSION = 1;
export const SHARE_HASH_KEY = 'del';

const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const MAX_NAME_LENGTH = 60;
const MAX_ENTRIES_PER_DAY = 40;
const MAX_SUBJECTS = 80;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ekte lenker er 700–2000 tegn. Alt over dette avvises før dekomprimering. */
const MAX_TOKEN_LENGTH = 20_000;
/** Dekomprimert JSON kan aldri lovlig bli større enn dette. */
const MAX_INFLATED_BYTES = 256 * 1024;

/** Lenker lengre enn dette er upraktiske å dele; QR-koden blir også for tett. */
export const SHARE_URL_SOFT_LIMIT = 2000;

/* ─── Base64url ────────────────────────────────────────────── */

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text) {
  const normalized = String(text || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Inflate med tak på utdata, så en «zip-bombe» i en lenke ikke fryser fanen. */
function inflateWithLimit(bytes, maxBytes) {
  const chunks = [];
  let total = 0;
  const inflater = new Inflate();
  inflater.ondata = (chunk) => {
    total += chunk.length;
    if (total > maxBytes) throw new Error('Lenken er for stor.');
    chunks.push(chunk);
  };
  inflater.push(bytes, true);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => { out.set(chunk, offset); offset += chunk.length; });
  return out;
}

/* ─── Normalisering ────────────────────────────────────────── */

/** HH:MM når verdien lar seg tolke, ellers uendret (valideringen fanger resten). */
function normalizeTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (TIME_RE.test(raw)) return raw;
  if (!/^\d{1,2}[:.]\d{2}$/.test(raw) && !/^\d{1,4}$/.test(raw)) return raw;
  const minutes = getMinutesFromTime(raw);
  if (minutes < 0 || minutes >= 24 * 60) return raw;
  return formatMinutesAsTime(minutes);
}

const FORBIDDEN_NAMES = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty']);

/** Fjerner usynlige tegn (nullbredde, retningsmarkører, kontrolltegn) og normaliserer unicode. */
function normalizeName(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/[\p{Cf}\p{Cc}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ─── Payload ──────────────────────────────────────────────── */

function compactEntries(list) {
  return (Array.isArray(list) ? list : [])
    .filter(entry => entry && entry.time && entry.end && entry.activity)
    .map(entry => {
      const out = {
        time: normalizeTime(entry.time),
        end: normalizeTime(entry.end),
        activity: String(entry.activity).trim(),
      };
      if (entry.weekParity) out.weekParity = entry.weekParity;
      if (entry.parallel) out.parallel = true;
      return out;
    });
}

/**
 * Farger og emoji som er lik standarden i subjects.js utelates: mottakeren
 * får dem tilbake via expandSubjectDefaults, og lenken blir mye kortere.
 */
function compactSubjectMap(map, field) {
  const out = {};
  Object.entries(map || {}).forEach(([name, value]) => {
    if (!value) return;
    const standard = getSubject(name)?.[field];
    if (standard && String(standard).toUpperCase() === String(value).toUpperCase()) return;
    out[name] = value;
  });
  return out;
}

/** Bygger den delbare representasjonen av én klasse. */
export function buildSharePayload(classData, className) {
  if (!classData) throw new Error('Ingen klasse å dele.');
  const name = normalizeName(classData.name || className);
  const schedule = {};
  const breaks = {};
  DAYS.forEach(day => {
    const lessons = compactEntries(classData.schedule?.[day]);
    const dayBreaks = compactEntries(classData.breaks?.[day]);
    if (lessons.length) schedule[day] = lessons;
    if (dayBreaks.length) breaks[day] = dayBreaks;
  });
  const payload = {
    v: SHARE_VERSION,
    app: 'klasseromsskjerm', // fast formatnavn, uavhengig av appens navn
    updatedAt: new Date().toISOString(),
    name,
    schedule,
    breaks,
    subjectColors: compactSubjectMap(classData.subjectColors, 'color'),
    subjectEmojis: compactSubjectMap(classData.subjectEmojis, 'emoji'),
    multiGradeMode: !!classData.multiGradeMode,
  };
  if (classData.multiGradeMode && Array.isArray(classData.multiGradeLabels)) {
    payload.multiGradeLabels = classData.multiGradeLabels.slice(0, 2);
  }
  return payload;
}

/* ─── Koding / dekoding ────────────────────────────────────── */

/** JSON → deflate → base64url, med versjonsprefiks «1.». */
export function encodeSharePayload(payload) {
  const json = JSON.stringify(payload);
  const compressed = deflateSync(strToU8(json), { level: 9 });
  return `1.${bytesToBase64Url(compressed)}`;
}

/** Omvendt av encodeSharePayload. Kaster Error med norsk melding ved feil. */
export function decodeShareToken(token) {
  const raw = String(token || '').trim();
  if (!raw) throw new Error('Lenken inneholder ingen timeplan.');
  if (raw.length > MAX_TOKEN_LENGTH) throw new Error('Lenken er for stor til å være en timeplan.');
  const dot = raw.indexOf('.');
  const kind = dot === -1 ? '0' : raw.slice(0, dot);
  const body = dot === -1 ? raw : raw.slice(dot + 1);
  let json;
  try {
    const bytes = base64UrlToBytes(body);
    json = kind === '1'
      ? strFromU8(inflateWithLimit(bytes, MAX_INFLATED_BYTES))
      : strFromU8(bytes);
  } catch (err) {
    if (err?.message === 'Lenken er for stor.') throw new Error('Lenken er for stor til å være en timeplan.', { cause: err });
    throw new Error('Lenken er skadet eller ufullstendig.', { cause: err });
  }
  if (json.length > MAX_INFLATED_BYTES) throw new Error('Lenken er for stor til å være en timeplan.');
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new Error('Lenken er skadet eller ufullstendig.');
  }
  return validateSharePayload(payload);
}

/* ─── Validering ───────────────────────────────────────────── */

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateEntries(list, where) {
  if (!Array.isArray(list)) throw new Error(`Ugyldig timeplan (${where}).`);
  if (list.length > MAX_ENTRIES_PER_DAY) throw new Error(`For mange økter (${where}).`);
  return list.map(entry => {
    if (!isPlainObject(entry)) throw new Error(`Ugyldig økt (${where}).`);
    const time = normalizeTime(entry.time);
    const end = normalizeTime(entry.end);
    const activity = normalizeName(entry.activity);
    if (!TIME_RE.test(time) || !TIME_RE.test(end)) throw new Error(`Ugyldig klokkeslett (${where}).`);
    if (!activity || activity.length > 120) throw new Error(`Ugyldig aktivitet (${where}).`);
    const out = { time, end, activity };
    if (entry.weekParity === 'partall' || entry.weekParity === 'oddetall') out.weekParity = entry.weekParity;
    if (entry.parallel === true) out.parallel = true;
    return out;
  });
}

function validateSubjectMap(map, field) {
  if (map === undefined) return {};
  if (!isPlainObject(map)) throw new Error('Ugyldige fagfarger.');
  const entries = Object.entries(map);
  if (entries.length > MAX_SUBJECTS) throw new Error('For mange fag.');
  const out = {};
  entries.forEach(([name, value]) => {
    const key = normalizeName(name);
    const val = String(value ?? '').trim();
    if (!key || key.length > 120 || FORBIDDEN_NAMES.has(key) || !val || val.length > 16) return;
    if (field === 'color' && !/^#[0-9a-fA-F]{6}$/.test(val)) return;
    out[key] = val;
  });
  return out;
}

/** Returnerer en renset kopi av payloaden, eller kaster Error. */
export function validateSharePayload(payload) {
  if (!isPlainObject(payload)) throw new Error('Lenken inneholder ikke en timeplan.');
  if (payload.v !== SHARE_VERSION) throw new Error('Lenken er laget med en nyere versjon av Klasseskjerm. Oppdater siden og prøv igjen.');
  const name = normalizeName(payload.name);
  if (!name) throw new Error('Klassen mangler navn.');
  if (name.length > MAX_NAME_LENGTH) throw new Error('Klassenavnet er for langt.');
  if (FORBIDDEN_NAMES.has(name)) throw new Error('Klassenavnet kan ikke brukes.');
  if (!isPlainObject(payload.schedule)) throw new Error('Lenken mangler timeplan.');

  const schedule = {};
  const breaks = {};
  DAYS.forEach(day => {
    schedule[day] = payload.schedule[day] ? validateEntries(payload.schedule[day], day) : [];
    breaks[day] = isPlainObject(payload.breaks) && payload.breaks[day] ? validateEntries(payload.breaks[day], `${day}, pauser`) : [];
  });

  return {
    v: SHARE_VERSION,
    updatedAt: typeof payload.updatedAt === 'string' && !Number.isNaN(Date.parse(payload.updatedAt)) ? payload.updatedAt : null,
    name,
    schedule,
    breaks,
    subjectColors: validateSubjectMap(payload.subjectColors, 'color'),
    subjectEmojis: validateSubjectMap(payload.subjectEmojis, 'emoji'),
    // Tri-state: true/false når avsender har sagt noe, null når feltet mangler
    multiGradeMode: typeof payload.multiGradeMode === 'boolean' ? payload.multiGradeMode : null,
    multiGradeLabels: Array.isArray(payload.multiGradeLabels)
      ? payload.multiGradeLabels.slice(0, 2).map(label => normalizeName(label).slice(0, 10))
      : null,
  };
}

/* ─── Sammenslåing med lokale data ─────────────────────────── */

/**
 * Fyller inn standardfarge og -emoji for alle fag i timeplanen som mangler
 * en eksplisitt verdi. Hovedskjermen klarer seg uten, men timeplaneditoren
 * gir ukjente fag en blå standardfarge som så lagres – det unngår vi her.
 */
export function expandSubjectDefaults(classData) {
  const colors = { ...(classData.subjectColors || {}) };
  const emojis = { ...(classData.subjectEmojis || {}) };
  const names = new Set();
  DAYS.forEach(day => {
    [...(classData.schedule?.[day] || []), ...(classData.breaks?.[day] || [])].forEach(entry => {
      getActivitySubjectParts(entry?.activity).forEach(segment => {
        const raw = segment.subject;
        if (raw) names.add(raw);
        const canonical = canonicalizeSubjectName(raw);
        if (canonical) names.add(canonical);
      });
    });
  });
  names.forEach(name => {
    const standard = getSubject(name);
    if (!standard) return;
    if (!colors[name]) colors[name] = standard.color;
    if (!emojis[name]) emojis[name] = standard.emoji;
  });
  classData.subjectColors = colors;
  classData.subjectEmojis = emojis;
  return classData;
}

/**
 * Lager klassedata fra en validert payload. Timeplan, pauser, farger og emoji
 * erstattes; agenda, maler og nedtellinger fra en eksisterende klasse med
 * samme navn beholdes, så eleven/læreren ikke mister eget arbeid.
 */
export function buildClassFromSharePayload(payload, existingClass) {
  const base = existingClass
    ? JSON.parse(JSON.stringify(existingClass))
    : cloneDefaultClass();

  base.name = payload.name;
  base.schedule = JSON.parse(JSON.stringify(payload.schedule));
  base.breaks = JSON.parse(JSON.stringify(payload.breaks));
  base.subjectColors = { ...payload.subjectColors };
  base.subjectEmojis = { ...payload.subjectEmojis };
  expandSubjectDefaults(base);

  const grades = extractGradesFromName(payload.name);
  base.multiGradeMode = payload.multiGradeMode === null ? grades.length === 2 : payload.multiGradeMode;
  base.multiGradeLabels = payload.multiGradeLabels && payload.multiGradeLabels.filter(Boolean).length
    ? payload.multiGradeLabels
    : getDefaultMultiGradeLabels(payload.name);

  if (!existingClass) {
    base.agendas = {};
    base.templates = {};
    base.customCountdowns = [];
    base.countdownsVisible = true;
  }
  base.importedAt = new Date().toISOString();
  if (payload.updatedAt) base.sharedAt = payload.updatedAt;

  ensureClassData(base);
  return base;
}

/** Antall ulike tidspunkter per uke (ukeveksling teller som én økt). */
export function countLessonsInPayload(payload) {
  return DAYS.reduce((sum, day) => {
    const starts = new Set((payload.schedule?.[day] || []).map(entry => entry.time));
    return sum + starts.size;
  }, 0);
}

/* ─── URL-håndtering ───────────────────────────────────────── */

export function buildShareUrl(token) {
  const base = window.location.href.split('#')[0];
  return `${base}#${SHARE_HASH_KEY}=${token}`;
}

/** Leser et delings-token fra URL-ens #-del, eller null. */
export function readShareTokenFromLocation() {
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const token = params.get(SHARE_HASH_KEY);
  return token ? token.trim() : null;
}

/** Fjerner #del=… fra adresselinjen uten å laste siden på nytt. */
export function clearShareHashFromLocation() {
  try {
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}`);
  } catch {
    // Ikke kritisk
  }
}
