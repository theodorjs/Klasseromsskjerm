/**
 * Lagring som aldri kaster.
 *
 * Tilgang til localStorage kan feile på flere måter en lærer ikke rår over:
 * blokkert nettstedsdata, full kvote, sandkasse-iframe i en LMS, privat
 * modus i eldre Safari. Ingen av dem skal gi hvit skjerm – derfor går all
 * lesing og skriving gjennom disse hjelperne, og selve oppslaget av
 * `window.localStorage` skjer inne i try-blokken.
 */

function resolveStorage(storage) {
  return storage || window.localStorage;
}

export function safeGetItem(key, storage) {
  try {
    return resolveStorage(storage).getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key, value, storage) {
  try {
    resolveStorage(storage).setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Kunne ikke lagre «${key}»:`, err);
    return false;
  }
}

export function safeRemoveItem(key, storage) {
  try {
    resolveStorage(storage).removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Alle nøkler som starter med prefikset. Tom liste hvis lagring er utilgjengelig. */
export function listKeysWithPrefix(prefix, storage) {
  const keys = [];
  try {
    const s = resolveStorage(storage);
    for (let i = 0; i < s.length; i += 1) {
      const key = s.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
  } catch {
    // ingen lagring
  }
  return keys.sort();
}

export const RESCUE_PREFIX = 'klasseromData.korrupt';
const MAX_RESCUE_COPIES = 5;

/**
 * Legger rådata til side under en tidsstemplet nøkkel i stedet for å
 * overskrive forrige redningskopi. Beholder de fem nyeste.
 */
export function stashRescuedData(raw) {
  if (!raw) return null;
  const key = `${RESCUE_PREFIX}.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  if (!safeSetItem(key, raw)) return null;
  const all = listKeysWithPrefix(RESCUE_PREFIX);
  all.slice(0, Math.max(0, all.length - MAX_RESCUE_COPIES)).forEach(old => safeRemoveItem(old));
  return key;
}

/* ─── Sanering av notat-HTML ───────────────────────────────── */

const ALLOWED_NOTE_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'BR', 'DIV', 'P', 'SPAN']);

function sanitizeNode(node, out) {
  node.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(document.createTextNode(child.textContent));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    if (ALLOWED_NOTE_TAGS.has(child.tagName)) {
      const clean = document.createElement(child.tagName.toLowerCase());
      sanitizeNode(child, clean);
      out.appendChild(clean);
    } else {
      // Ukjent element: behold teksten, dropp elementet og alle attributter
      sanitizeNode(child, out);
    }
  });
}

/**
 * Notatet lagres som HTML fra contentEditable. Når det kommer fra en fil
 * (sikkerhetskopi) kan det inneholde hva som helst, så vi beholder bare
 * enkel formatering og aldri attributter eller skript.
 */
export function sanitizeNoteHtml(html) {
  const text = String(html || '');
  if (!text) return '';
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const out = document.createElement('div');
    sanitizeNode(doc.body, out);
    return out.innerHTML;
  } catch {
    return '';
  }
}
