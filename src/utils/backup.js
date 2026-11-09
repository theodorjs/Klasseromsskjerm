/**
 * Sikkerhetskopi av alt appen lagrer lokalt – som én JSON-fil læreren kan
 * laste ned, og lese inn igjen på samme eller en annen maskin.
 */
import { ensureClassData } from './schedule.js';
import { safeGetItem, safeSetItem, listKeysWithPrefix, sanitizeNoteHtml } from './storage.js';

export const BACKUP_VERSION = 1;

/** Nøklene som gjenopprettes fra en sikkerhetskopi. */
export const BACKUP_KEYS = [
  'klasseromData',
  'currentClassName',
  'activeTimelineClassNames',
  'preferredMode',
  'classroomNoteHtml',
  'timerGradientBaseColor',
];

/** Redningskopier (korrupt/forrige) tas med i filen, men gjenopprettes aldri automatisk. */
const EXTRA_PREFIX = 'klasseromData.';

/** Samler rådata fra localStorage til ett objekt. Kaster aldri. */
export function collectBackupData() {
  const data = {};
  BACKUP_KEYS.forEach(key => {
    const value = safeGetItem(key);
    if (value !== null) data[key] = value;
  });
  const extra = {};
  listKeysWithPrefix(EXTRA_PREFIX).forEach(key => {
    const value = safeGetItem(key);
    if (value !== null) extra[key] = value;
  });
  return {
    app: 'klasseromsskjerm', // fast formatnavn: eldre kopier skal fortsatt kunne leses
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    extra,
  };
}

export function buildBackupFilename(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `klasseskjerm-sikkerhetskopi-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Laster ned sikkerhetskopien som fil. Returnerer true hvis det gikk. */
export function downloadBackup() {
  try {
    const backup = collectBackupData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildBackupFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Kunne ikke lage sikkerhetskopi:', err);
    return false;
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validerer innholdet i en sikkerhetskopifil.
 * Returnerer { data, classCount, classNames, exportedAt } eller kaster Error med norsk melding.
 */
export function parseBackupFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Filen er ikke en gyldig sikkerhetskopi.');
  }
  if (!isPlainObject(parsed) || parsed.app !== 'klasseromsskjerm' || !isPlainObject(parsed.data)) {
    throw new Error('Filen er ikke en sikkerhetskopi fra Klasseskjerm.');
  }
  const rawClasses = parsed.data.klasseromData;
  if (typeof rawClasses !== 'string') throw new Error('Sikkerhetskopien mangler klassedata.');

  let classes;
  try {
    classes = JSON.parse(rawClasses);
  } catch {
    throw new Error('Klassedataene i filen er skadet.');
  }
  if (!isPlainObject(classes)) throw new Error('Klassedataene i filen er skadet.');
  const names = Object.keys(classes).filter(name => Object.hasOwn(classes, name));
  if (!names.length) throw new Error('Sikkerhetskopien inneholder ingen klasser.');
  const cleanClasses = {};
  names.forEach(name => {
    const cd = classes[name];
    if (!isPlainObject(cd) || !isPlainObject(cd.schedule)) {
      throw new Error(`Klassen «${name}» i filen er skadet.`);
    }
    ensureClassData(cd);
    cleanClasses[name] = cd;
  });

  const data = {};
  BACKUP_KEYS.forEach(key => {
    const value = parsed.data[key];
    if (typeof value === 'string') data[key] = value;
  });
  data.klasseromData = JSON.stringify(cleanClasses);

  // Notatet er HTML fra contentEditable; fra en fil kan det være hva som helst.
  if (typeof data.classroomNoteHtml === 'string') data.classroomNoteHtml = sanitizeNoteHtml(data.classroomNoteHtml);

  // currentClassName må peke på en klasse som finnes
  if (!data.currentClassName || !Object.hasOwn(cleanClasses, data.currentClassName)) data.currentClassName = names[0];
  try {
    const active = JSON.parse(data.activeTimelineClassNames || '[]');
    const valid = Array.isArray(active) ? active.filter(n => Object.hasOwn(cleanClasses, n)) : [];
    data.activeTimelineClassNames = JSON.stringify(valid.length ? valid.slice(0, 2) : [data.currentClassName]);
  } catch {
    data.activeTimelineClassNames = JSON.stringify([data.currentClassName]);
  }

  return { data, classCount: names.length, classNames: names, exportedAt: parsed.exportedAt || null };
}

/**
 * Skriver en validert sikkerhetskopi til localStorage og laster siden på nytt.
 * Den eksisterende tilstanden legges først i «klasseromData.forrige».
 */
export function applyBackup(parsedBackup) {
  const previous = safeGetItem('klasseromData');
  if (previous) safeSetItem('klasseromData.forrige', previous);
  const allOk = Object.entries(parsedBackup.data).every(([key, value]) => safeSetItem(key, value));
  if (!allOk) throw new Error('Kunne ikke skrive til lagringen i nettleseren.');
  window.location.reload();
}
