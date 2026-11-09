import { useCallback, useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '../utils/storage.js';
import { getOsloDateParts, getMinutesFromTime } from '../utils/time.js';

/* Dagens time: tittel, tid, læringsmål og agenda som læreren setter opp for
   én time i dag. Lagres for seg (ikke i klassedataene), gjelder bare denne
   skjermen og bare i dag, så den kan aldri ødelegge timeplanen. */

export const DAGENS_TIME_KEY = 'klasseskjerm.dagensTimer';

/** Minutter før start da timen dukker opp på tavla av seg selv */
export const VIS_FOER_START = 10;

function tosifret(n) {
  return String(n).padStart(2, '0');
}

export function dagensDato(date = new Date()) {
  const { year, month, day } = getOsloDateParts(date);
  return `${year}-${tosifret(month)}-${tosifret(day)}`;
}

/** «10», «1000», «10.00», «10:00» og «9:5» blir «10:00»/«09:05». Ugyldig gir ''. */
export function tolkKlokkeslett(verdi) {
  const raw = String(verdi || '').trim().replace(/[.,;\s]/g, ':');
  let t; let m;
  let treff = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  if (treff) { t = Number(treff[1]); m = Number(treff[2]); }
  else if ((treff = raw.match(/^(\d{1,2})$/))) { t = Number(treff[1]); m = 0; }
  else if ((treff = raw.match(/^(\d{3,4})$/))) {
    const s = treff[1].padStart(4, '0');
    t = Number(s.slice(0, 2)); m = Number(s.slice(2));
  } else return '';
  if (!(t >= 0 && t <= 23 && m >= 0 && m <= 59)) return '';
  return `${tosifret(t)}:${tosifret(m)}`;
}

function rensTime(t) {
  if (!t || typeof t !== 'object') return null;
  const fra = tolkKlokkeslett(t.fra);
  const til = tolkKlokkeslett(t.til);
  if (!fra || !til || typeof t.dato !== 'string') return null;
  return {
    id: typeof t.id === 'string' && t.id ? t.id : `time-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dato: t.dato,
    dag: typeof t.dag === 'string' ? t.dag : '',
    tittel: typeof t.tittel === 'string' ? t.tittel : '',
    fra,
    til,
    maal: typeof t.maal === 'string' ? t.maal : '',
    punkter: Array.isArray(t.punkter)
      ? t.punkter
        .filter(p => p && typeof p.tekst === 'string' && p.tekst.trim())
        .map(p => ({ tekst: p.tekst, ferdig: !!p.ferdig }))
      : [],
    fast: !!t.fast,
    fastVed: Number.isFinite(t.fastVed) ? t.fastVed : null,
    skjult: !!t.skjult,
  };
}

function lesTimer() {
  try {
    const raw = safeGetItem(DAGENS_TIME_KEY);
    if (!raw) return [];
    const liste = JSON.parse(raw);
    if (!Array.isArray(liste)) return [];
    const idag = dagensDato();
    // Gamle dager ryddes bort; dagens time er bare for i dag
    return liste.map(rensTime).filter(t => t && t.dato === idag);
  } catch {
    return [];
  }
}

/**
 * Timen som skal stå på tavla nå, eller null.
 * Vises fra ti minutter før start til slutt. «Vis på tavla» fester den i
 * tillegg: da vises den med en gang, og til timen er slutt (eller til den
 * skjules, hvis den ble festet etter at tiden var ute).
 */
export function finnSynligTime(timer, dato, dag, minutter) {
  let iVindu = null;
  let festet = null;
  for (const t of timer) {
    if (t.dato !== dato || t.skjult) continue;
    if (t.dag && dag && t.dag !== dag) continue;
    const start = getMinutesFromTime(t.fra);
    const slutt = getMinutesFromTime(t.til);
    if (minutter >= start - VIS_FOER_START && minutter < slutt) {
      if (!iVindu || start > getMinutesFromTime(iVindu.fra)) iVindu = t;
    } else if (t.fast && (minutter < slutt || (t.fastVed ?? 0) >= slutt)) {
      festet = t;
    }
  }
  return iVindu || festet;
}

/** «35 min», «1 t 10 min» */
export function minTekst(n) {
  const m = Math.max(0, Math.round(n));
  if (m >= 60) {
    const t = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${t} t ${r} min` : `${t} t`;
  }
  return `${m} min`;
}

/**
 * Hvor timen står akkurat nå: samme tekst på tavla, i «Vis for klassen» og
 * på elevens iPad. naaIndex er agendapunktet klassen er på (første som ikke
 * er krysset av), bare mens timen pågår.
 */
export function timeStatus(time, minutter) {
  const start = getMinutesFromTime(time.fra);
  const slutt = getMinutesFromTime(time.til);
  const paagaar = minutter >= start && minutter < slutt;
  const foer = minutter < start;
  let status = '';
  if (paagaar) status = `${minTekst(slutt - minutter)} igjen`;
  else if (foer) status = start - minutter <= 90 ? `Starter om ${minTekst(start - minutter)}` : `Starter kl. ${time.fra}`;
  const naaIndex = paagaar ? time.punkter.findIndex(p => !p.ferdig) : -1;
  const framdrift = paagaar ? Math.min(100, Math.max(0, ((minutter - start) / Math.max(1, slutt - start)) * 100)) : null;
  return { start, slutt, paagaar, foer, status, naaIndex, framdrift };
}

export function useDagensTime() {
  const [timer, setTimer] = useState(lesTimer);

  useEffect(() => {
    safeSetItem(DAGENS_TIME_KEY, JSON.stringify(timer));
  }, [timer]);

  // Ved midnatt (eller når fanen har stått åpen over natta) ryddes gårsdagen bort
  useEffect(() => {
    const id = setInterval(() => {
      const idag = dagensDato();
      setTimer(prev => (prev.some(t => t.dato !== idag) ? prev.filter(t => t.dato === idag) : prev));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const lagreTime = useCallback((time) => {
    const ren = rensTime(time);
    if (!ren) return;
    setTimer(prev => {
      // Samme time (id) eller samme starttid erstattes; ellers legges den til
      const uten = prev.filter(t => t.id !== ren.id && !(t.fra === ren.fra && t.dato === ren.dato));
      const neste = ren.fast ? uten.map(t => (t.fast ? { ...t, fast: false } : t)) : uten;
      return [...neste, ren].sort((a, b) => getMinutesFromTime(a.fra) - getMinutesFromTime(b.fra));
    });
  }, []);

  const slettTime = useCallback((id) => {
    setTimer(prev => prev.filter(t => t.id !== id));
  }, []);

  const skjulTime = useCallback((id) => {
    setTimer(prev => prev.map(t => (t.id === id ? { ...t, skjult: true, fast: false } : t)));
  }, []);

  const vekslePunkt = useCallback((id, index) => {
    setTimer(prev => prev.map(t => {
      if (t.id !== id) return t;
      const punkter = t.punkter.map((p, i) => (i === index ? { ...p, ferdig: !p.ferdig } : p));
      return { ...t, punkter };
    }));
  }, []);

  return { timer, lagreTime, slettTime, skjulTime, vekslePunkt };
}
