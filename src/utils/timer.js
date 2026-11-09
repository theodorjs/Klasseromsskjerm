/**
 * Hjelpere for nedtelleren: lagring som overlever at siden lastes på nytt,
 * og en myk lyd når tiden er ute.
 */
import { safeGetItem, safeSetItem, safeRemoveItem } from './storage.js';
import { normalizeHexColor } from './color.js';

export const TIMER_SETTINGS_KEY = 'timerInnstillinger';
export const TIMER_RUN_KEY = 'timerKjoring';
export const TIMER_POSITION_KEY = 'timerPosisjon';

/** Hvor læreren sist la nedtelleren, holdt innenfor skjermen. */
export function loadTimerPosition() {
  try {
    const raw = safeGetItem(TIMER_POSITION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return clampTimerPosition(parsed, 380, 200);
  } catch {
    return null;
  }
}

export function saveTimerPosition(pos) {
  if (!pos) safeRemoveItem(TIMER_POSITION_KEY);
  else safeSetItem(TIMER_POSITION_KEY, JSON.stringify(pos));
}

/** Minst 60 px av panelet skal alltid være synlig, så det kan dras tilbake. */
export function clampTimerPosition(pos, width, height) {
  const vw = window.innerWidth || 1024;
  const vh = window.innerHeight || 768;
  return {
    x: Math.min(Math.max(0, pos.x), Math.max(0, vw - Math.min(width, vw))),
    y: Math.min(Math.max(0, pos.y), Math.max(0, vh - Math.min(height, 60))),
  };
}

/** Klassisk TimeTimer-rød, brukt når ingen fagfarge finnes. */
export const TIMER_CLASSIC_RED = '#E8412C';

export const TIMER_PRESETS_MIN = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

const DEFAULT_SETTINGS = {
  mode: 'fixed60',      // 'fixed60' (som den fysiske) | 'fit' (hele skiva = valgt tid)
  sound: true,
  colorOverride: null,  // hex eller null = følg faget
  durationMs: 10 * 60 * 1000,
  task: '',             // hva klassen skal gjøre, vist over stor visning
};

/** Lengste oppgavetekst over den store nedtelleren: én til to linjer på tavla. */
export const TIMER_TASK_MAX = 90;

export function loadTimerSettings() {
  try {
    const raw = safeGetItem(TIMER_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_SETTINGS };
    return {
      mode: parsed.mode === 'fit' ? 'fit' : 'fixed60',
      sound: parsed.sound !== false,
      colorOverride: normalizeHexColor(parsed.colorOverride) || null,
      durationMs: clampDuration(parsed.durationMs),
      task: typeof parsed.task === 'string' ? parsed.task.slice(0, TIMER_TASK_MAX) : '',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveTimerSettings(settings) {
  safeSetItem(TIMER_SETTINGS_KEY, JSON.stringify(settings));
}

export const MAX_DURATION_MS = 99 * 60 * 60 * 1000;

export function clampDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SETTINGS.durationMs;
  return Math.min(MAX_DURATION_MS, Math.max(1000, Math.round(n)));
}

/**
 * Pågående kjøring: { endAt, totalMs, pausedRemainingMs }.
 * endAt er null når timeren står på pause.
 */
export function loadTimerRun() {
  try {
    const raw = safeGetItem(TIMER_RUN_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const totalMs = Number(parsed.totalMs);
    if (!Number.isFinite(totalMs) || totalMs <= 0) return null;
    const endAt = parsed.endAt == null ? null : Number(parsed.endAt);
    const pausedRemainingMs = parsed.pausedRemainingMs == null ? null : Number(parsed.pausedRemainingMs);
    if (endAt !== null && !Number.isFinite(endAt)) return null;
    if (pausedRemainingMs !== null && !Number.isFinite(pausedRemainingMs)) return null;
    return { totalMs, endAt, pausedRemainingMs };
  } catch {
    return null;
  }
}

export function saveTimerRun(run) {
  if (!run) safeRemoveItem(TIMER_RUN_KEY);
  else safeSetItem(TIMER_RUN_KEY, JSON.stringify(run));
}

export function formatTimerReadout(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDurationLabel(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s} sek`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sek`;
}

/* ─── Lyd ──────────────────────────────────────────────────────────── */

let audioContext = null;

/** Må kalles fra et brukerklikk (Start), ellers nekter nettleseren å spille senere. */
export function primeTimerAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioContext) audioContext = new Ctx();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  } catch {
    audioContext = null;
  }
}

/** Tre myke toner, som en klokke i et klasserom, ikke en alarm. */
export function playTimerChime() {
  try {
    if (!audioContext) primeTimerAudio();
    if (!audioContext) return false;
    const ctx = audioContext;
    const start = ctx.currentTime + 0.02;
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = start + i * 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1);
    });
    return true;
  } catch {
    return false;
  }
}

/* ─── Skala på skiva ───────────────────────────────────────────────── */

/**
 * Velger en tallskala som gir 4–12 tall rundt skiva.
 * Returnerer { unitSeconds, total, labelStep, minorStep, unitLabel } der alt er i
 * «enheter»: minutter for timere på to minutter eller mer, ellers sekunder.
 * Enheten tegnes på skiva, så «50» aldri kan leses som 50 minutter på en 1-minutter.
 */
export function buildDialScale(totalMs, mode) {
  if (mode === 'fixed60') {
    return { unitSeconds: 60, total: 60, labelStep: 5, minorStep: 1, unitLabel: 'min' };
  }
  const totalSeconds = Math.max(1, totalMs / 1000);
  // Minutter fra to minutter og opp (med halvminutt der det trengs); bare helt korte timere får sekunder
  const useMinutes = totalSeconds >= 120;
  const unitSeconds = useMinutes ? 60 : 1;
  const total = totalSeconds / unitSeconds;
  // Rekkefølgen er «hvor pent» trinnet er på en urskive: 5-ere først, som på en TimeTimer
  // Halvminutt bare på helt korte timere; fra fem minutter er hele minutter alltid penere
  const niceness = useMinutes
    ? (total < 5 ? [5, 10, 15, 1, 2, 3, 0.5, 30, 60] : [5, 10, 15, 1, 2, 3, 30, 60])
    : [10, 15, 30, 5, 60];
  const labelsFor = step => total / step;
  const divides = step => Math.abs(labelsFor(step) - Math.round(labelsFor(step))) < 1e-9;
  const labelStep =
    niceness.find(step => divides(step) && labelsFor(step) >= 4 && labelsFor(step) <= 12)
    || niceness.find(step => divides(step) && labelsFor(step) <= 12)
    || [...niceness].sort((x, y) => x - y).find(step => labelsFor(step) <= 12)
    || niceness[niceness.length - 1];
  const minorStep = labelStep >= 15 ? labelStep / 3 : labelStep >= 10 ? labelStep / 5 : labelStep >= 2 ? 1 : labelStep / 2;
  return { unitSeconds, total, labelStep, minorStep, unitLabel: useMinutes ? 'min' : 'sek' };
}
