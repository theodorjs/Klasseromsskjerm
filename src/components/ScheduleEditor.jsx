import { useState, useEffect } from "react";
import Info from './Info.jsx';
import Dialog from './Dialog.jsx';
import { isClassMultiGrade, formatTeachers, normalizeTeachers, normalizeParallelTeachers } from '../utils/schedule.js';
import { getMinutesFromTime } from '../utils/time.js';
import { getSubject } from '../data/subjects.js';
import Ikon, { FagSymbol } from './Ikon.jsx';
import SymbolVelger from './SymbolVelger.jsx';

/* ─── Konstanter ─────────────────────────────────────────── */

const DAYS_S = ["Man.","Tir.","Ons.","Tor.","Fre."];
const DAYS   = ["Mandag","Tirsdag","Onsdag","Torsdag","Fredag"];
// Celleverdier i editoren:
//   null                                  - tom
//   number                                - ett fag
//   {a, b}                                - fadelt: delt per trinn
//   {type:'week', even, odd}              - veksler mellom partalls-/oddetallsuker
//   {type:'parallel', ids:[...]}          - flere fag samtidig (pa tvers av trinn)
const isObj      = v => v !== null && typeof v === "object";
const isSplit    = v => isObj(v) && !v.type;
const isWeekAlt  = v => isObj(v) && v.type === "week";
const isParallel = v => isObj(v) && v.type === "parallel";
/** Har cella minst ett fag, uansett celletype? */
const harFag = v => {
  if (v === null || v === undefined) return false;
  if (!isObj(v)) return true;
  if (isParallel(v)) return (v.ids || []).some(Boolean);
  if (isWeekAlt(v)) return v.even != null || v.odd != null;
  return v.a != null || v.b != null;
};

const BREAK_NAMES = ["Pause", "Mat", "Storefri"];

/** Kort fagnavn til trange delceller («Matte», «K&H»); egne fag beholder navnet sitt. */
const shortName = name => getSubject(name)?.short || name;

/**
 * CSS-variabler for fagfargen. Tonene regnes ut her (hex + alfa) i stedet for
 * color-mix() i CSS, så editoren også virker i eldre Safari på iPad.
 */
const fagVars = (color, cursor) => {
  const hex = /^#[0-9a-f]{6}$/i.test(color || '') ? color : null;
  return {
    '--fag': hex || 'transparent',
    '--fag-tint': hex ? `${hex}3a` : 'transparent',
    '--fag-tint-sterk': hex ? `${hex}70` : 'transparent',
    ...(cursor ? { cursor } : {}),
  };
};

/** Trekker ut to tall fra klassenavn som «5. og 6. trinn» eller «5 og 6» */
const parseClassParts = name => {
  const m = name.match(/(\d+\.?)\s+og\s+(\d+\.?)/i);
  return m ? [m[1], m[2]] : null;
};

/**
 * Standardrammer for skoledagen.
 * b2 slår sammen Mat + Storefri til ett synlig pauseblokk i editoren.
 */
const FRAME0 = [
  {id:"l1",type:"lesson",label:"1. time",         start:"08:30",end:"09:30"},
  {id:"b1",type:"break", label:"Lillefri",         start:"09:30",end:"09:40"},
  {id:"l2",type:"lesson",label:"2. time",          start:"09:40",end:"10:40"},
  {id:"b2",type:"break", label:"Lunsj & Storefri", start:"10:40",end:"11:25"},
  {id:"l3",type:"lesson",label:"3. time",          start:"11:25",end:"12:25"},
  {id:"b3",type:"break", label:"Pause",            start:"12:25",end:"12:35"},
  {id:"l4",type:"lesson",label:"4. time",          start:"12:35",end:"13:35"},
  {id:"l5",type:"lesson",label:"5. time",          start:"13:35",end:"14:35"},
];

/** Fagene som står i paletten fra start. Farge og emoji hentes fra subjects.js. */
const DEFAULT_PALETTE = [
  "Norsk", "Matematikk", "Engelsk", "Naturfag", "Samfunnsfag", "KRLE",
  "Kunst og håndverk", "Musikk", "Kroppsøving", "Valgfag", "Leksehjelp", "Språkfag",
  "Uteskole",
];

const SUBJ0 = DEFAULT_PALETTE.map((name, i) => {
  const { color, emoji } = getSubject(name);
  return { id: i + 1, name, emoji, color };
});

const blankSched = fr => {
  const s = {};
  DAYS.forEach(d => {
    s[d] = {};
    fr.filter(r => r.type === "lesson").forEach(l => { s[d][l.id] = null; });
  });
  return s;
};

/**
 * Lærere per økt i editoren: { dag: { økt-id: [lærer 1, lærer 2] } }.
 * En parallell økt har i stedet én gruppe per fag: [[lærer, lærer], [lærer], …].
 */
const blankLaerere = () => Object.fromEntries(DAYS.map(d => [d, {}]));

/**
 * Hva de to lærerfeltene betyr i en celle. Fådelt: én lærer per trinn.
 * Ukeveksling: én for partalls- og én for oddetallsuker. Ellers to likestilte.
 */
const laererEtiketter = (raw, parts) => {
  if (isWeekAlt(raw)) return ['Partallsuker', 'Oddetallsuker'];
  if (isSplit(raw)) return parts ? [`${parts[0]} trinn`, `${parts[1]} trinn`] : ['Trinn A', 'Trinn B'];
  return ['Lærer 1', 'Lærer 2'];
};

/* ─── Konvertering: eksisterende klassedata → editor-state ── */

function stripGrade(name) {
  return String(name || '')
    .replace(/\s+\d+\.-\d+\.?$/, '')
    .replace(/\s+\d+\.?$/, '')
    .trim();
}

/**
 * Samler fagpaletten fra alle kjente kilder, slik at egendefinerte fag
 * overlever en runde med lagring + ny apning av editoren.
 */
function collectSubjects(currentClass, baseSubj) {
  const byKey = new Map();
  let nextId = 1;

  const add = (rawName, color, emoji) => {
    const name = String(rawName || '').trim();
    if (!name) return;
    if (BREAK_NAMES.includes(name)) return;
    const key = name.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      if (color) existing.color = color;
      if (emoji) existing.emoji = emoji;
      return;
    }
    byKey.set(key, {
      id: nextId++,
      name,
      emoji: emoji || 'book-open',
      color: color || '#4A90E2',
    });
  };

  const savedColors = currentClass?.subjectColors || {};
  const savedEmojis = currentClass?.subjectEmojis || {};

  // a) Standardfag (med eventuelle lagrede overstyringer)
  baseSubj.forEach(sub => add(sub.name, savedColors[sub.name] || sub.color, savedEmojis[sub.name] || sub.emoji));

  // b) Egendefinerte fag som er lagret med farge/emoji
  Object.keys(savedColors).forEach(name => add(name, savedColors[name], savedEmojis[name]));
  Object.keys(savedEmojis).forEach(name => add(name, savedColors[name], savedEmojis[name]));

  // c) Fag som faktisk star i timeplanen (siste sikkerhetsnett)
  DAYS.forEach(day => {
    (currentClass?.schedule?.[day] || []).forEach(entry => {
      String(entry?.activity || '')
        .split('/')
        .forEach(part => add(stripGrade(part.trim()), savedColors[stripGrade(part.trim())], savedEmojis[stripGrade(part.trim())]));
    });
  });

  return [...byKey.values()];
}

function buildEditorStateFromClass(currentClass, currentClassName, baseSubj) {
  const isMg = isClassMultiGrade(currentClass);
  const lessonFrames = FRAME0.filter(f => f.type === "lesson");
  const subj = collectSubjects(currentClass, baseSubj);

  /** Finn fag-ID ved navn (ignorer stor/liten + trinn-suffiks) */
  const findId = (rawName) => {
    const raw  = String(rawName || '').trim().toLowerCase();
    const base = stripGrade(rawName).toLowerCase();
    const found = subj.find(sub => sub.name.toLowerCase() === base || sub.name.toLowerCase() === raw);
    return found?.id ?? null;
  };

  const sched = blankSched(FRAME0);
  const laerere = blankLaerere();
  DAYS.forEach(day => {
    const entries = [...(currentClass?.schedule?.[day] || [])]
      .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));

    // Grupper pa starttid, slik at partall/oddetall-par havner i samme celle
    const byTime = new Map();
    entries.forEach(entry => {
      const key = entry.time;
      if (!byTime.has(key)) byTime.set(key, []);
      byTime.get(key).push(entry);
    });

    [...byTime.values()].forEach((group, i) => {
      if (i >= lessonFrames.length) return;
      const fid = lessonFrames[i].id;

      // Ukeveksling: to oppforinger pa samme tid med ulik weekParity
      const even = group.find(e => e.weekParity === 'partall');
      const odd  = group.find(e => e.weekParity === 'oddetall');
      laerere[day][fid] = (even || odd)
        ? [even?.teachers?.find(Boolean) || '', odd?.teachers?.find(Boolean) || '']
        : group[0]?.parallel
          ? (normalizeParallelTeachers(group[0]?.teachers) || [])
          : [...(group[0]?.teachers || [])];
      if (even || odd) {
        sched[day][fid] = {
          type: 'week',
          even: even ? findId(even.activity) : null,
          odd:  odd  ? findId(odd.activity)  : null,
        };
        return;
      }

      const entry = group[0];
      const act = entry?.activity || '';

      // Parallelle fag (flagget ved lagring)
      if (entry?.parallel) {
        sched[day][fid] = {
          type: 'parallel',
          ids: act.split('/').map(part => findId(part.trim())).filter(Boolean),
        };
        return;
      }

      if (act.includes('/') && isMg) {
        const [rawA, rawB] = act.split('/').map(part => part.trim());
        sched[day][fid] = { a: findId(rawA), b: findId(rawB) };
      } else {
        sched[day][fid] = findId(act);
      }
    });
  });

  return { subj, sched, laerere, isMg, cn: currentClassName };
}

/* ─── Konvertering: editor-state → classData.schedule + breaks ─ */

/**
 * Returnerer { schedule, breaks } klare til å lagres i klassedata.
 * b2-blokken (Lunsj & Storefri) splittes tilbake til «Mat» + «Storefri».
 */
function buildClassDataFromEditorState(subjects, sched, frames, gradeLabels = null, laerere = {}) {
  const schedule = {};
  const breaks   = {};
  const nameOf   = id => subjects.find(sub => sub.id === id)?.name || null;

  DAYS.forEach(day => {
    schedule[day] = [];
    breaks[day]   = [];

    frames.forEach(frame => {
      if (frame.type === "break") {
        if (frame.id === "b2") {
          breaks[day].push({ time: "10:40", end: "11:00", activity: "Mat" });
          breaks[day].push({ time: "11:00", end: "11:25", activity: "Storefri" });
        } else {
          const activity = frame.id === "b1" || frame.id === "b3" ? "Pause" : frame.label;
          breaks[day].push({ time: frame.start, end: frame.end, activity });
        }
        return;
      }

      const raw = sched[day]?.[frame.id];
      if (raw === null || raw === undefined) return;
      const cellListe = laerere[day]?.[frame.id] || [];
      const [laererA = '', laererB = ''] = isParallel(raw) ? [] : cellListe;
      // Fådelt: plassen viser trinnet (en tom første plass beholdes som ''),
      // og en plass uten fag har heller ikke lærer
      const cellLaerere = isSplit(raw)
        ? normalizeTeachers([nameOf(raw.a) ? laererA : '', nameOf(raw.b) ? laererB : ''])
        : normalizeTeachers([laererA, laererB].filter(n => String(n || '').trim()));
      const base = { time: frame.start, end: frame.end, ...(cellLaerere ? { teachers: cellLaerere } : {}) };

      // Ukeveksling -> to oppforinger med hver sin weekParity og lærer
      if (isWeekAlt(raw)) {
        const evenName = nameOf(raw.even);
        const oddName  = nameOf(raw.odd);
        const tid = { time: frame.start, end: frame.end };
        const med = navn => (navn && String(navn).trim() ? { teachers: [String(navn).trim()] } : {});
        if (evenName) schedule[day].push({ ...tid, activity: evenName, weekParity: 'partall', ...med(laererA) });
        if (oddName)  schedule[day].push({ ...tid, activity: oddName,  weekParity: 'oddetall', ...med(laererB) });
        return;
      }

      // Parallelle fag -> en oppforing med flagg
      if (isParallel(raw)) {
        // Hvert fag tar med seg sin egen lærergruppe; tomme plasser faller bort sammen med lærerne
        const fag = (raw.ids || [])
          .map((id, i) => ({ navn: nameOf(id), laerere: Array.isArray(cellListe[i]) ? cellListe[i] : [] }))
          .filter(f => f.navn);
        if (!fag.length) return;
        const grupper = normalizeParallelTeachers(fag.map(f => f.laerere));
        schedule[day].push({ ...base, activity: fag.map(f => f.navn).join(' / '), parallel: true, ...(grupper ? { teachers: grupper } : {}) });
        return;
      }

      // Fadelt (delt per trinn). Trinn-suffikset ("Norsk 8.") er det
      // hovedskjermen bruker for a vite hvilket trinn som har hvilket fag.
      if (isSplit(raw)) {
        const nameA = nameOf(raw.a);
        const nameB = nameOf(raw.b);
        if (!nameA && !nameB) return;
        const [labelA, labelB] = gradeLabels || [];
        const tag = (name, label) => (name && label ? `${name} ${label}` : name);
        let activity;
        if (nameA && nameB) {
          activity = labelA && labelB
            ? `${tag(nameA, labelA)} / ${tag(nameB, labelB)}`
            : `${nameA} / ${nameB}`;
        } else {
          activity = nameA ? tag(nameA, labelA) : tag(nameB, labelB);
        }
        schedule[day].push({ ...base, activity });
        return;
      }

      const single = nameOf(raw);
      if (!single) return;
      schedule[day].push({ ...base, activity: single });
    });
  });

  return { schedule, breaks };
}

/* ─── Hoved-komponent ────────────────────────────────────── */

/**
 * Props:
 *   currentClass     – eksisterende klassedata (for initialisering)
 *   currentClassName – for visning og lagring
 *   onSave(schedule, breaks, subjectUpdates, className) – kalt ved lagring
 *   onBack           – kalt for å gå tilbake til klasselista
 */
export default function ScheduleEditor({
  currentClass,
  currentClassName,
  onSave,
  onBack,
}) {
  const [subj,   setSubj]   = useState(SUBJ0);
  const [sched,  setSched]  = useState(() => blankSched(FRAME0));
  const [frame,  setFrame]  = useState(FRAME0);
  const [active, setActive] = useState(null);
  const [erase,  setErase]  = useState(false);
  const [hover,  setHover]  = useState(null);
  const [focus,  setFocus]  = useState(null);   // celle valgt med trykk (iPad har ikke hover)
  const [cn,     setCn]     = useState(currentClassName || "");
  const [isMg,   setIsMg]   = useState(false);
  const [editCn, setEditCn] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [editSj, setEditSj] = useState(null);
  const [modal,  setModal]  = useState(null);
  const [fEdit,  setFEdit]  = useState(null);
  const [newSj,  setNewSj]  = useState({ name: "", emoji: "book-open", color: "#4A90E2" });
  const [newCn,  setNewCn]  = useState("");
  const [hjelp,  setHjelp]  = useState(false);
  const [laerere, setLaerere] = useState(blankLaerere);
  const [laererCelle, setLaererCelle] = useState(null);   // { day, lid } når lærerdialogen er åpen

  /* ── Initialiser fra eksisterende klassedata ── */
  useEffect(() => {
    if (!currentClass) return;
    const { subj: s, sched: sc, laerere: la, isMg: mg, cn: name } =
      buildEditorStateFromClass(currentClass, currentClassName, SUBJ0);
    setSubj(s);
    setSched(sc);
    setLaerere(la);
    setIsMg(mg);
    setCn(name);
    setFrame(FRAME0);
    setActive(null);
    setErase(false);
  }, [currentClass, currentClassName]);

  /* ── Hjelpefunksjoner ── */
  const gs    = id => subj.find(s => s.id === id);
  const parts = isMg ? (parseClassParts(cn) || ["A", "B"]) : null;
  const acSub = active ? gs(active) : null;

  /** Les fag-ID i en gitt "plass" i cella (slot = 'a'|'b'|'even'|'odd'|tall) */
  const slotValue = (raw, slot) => {
    if (slot === null) return isObj(raw) ? null : raw;
    if (isParallel(raw)) return raw.ids?.[slot] ?? null;
    if (isObj(raw)) return raw[slot] ?? null;
    return null;
  };

  /** Sett fag-ID i en gitt plass */
  const withSlot = (raw, slot, value) => {
    if (isParallel(raw)) {
      const ids = [...(raw.ids || [])];
      ids[slot] = value;
      return { ...raw, ids };
    }
    return { ...raw, [slot]: value };
  };

  const setCell = (day, lid, value) =>
    setSched(p => ({ ...p, [day]: { ...p[day], [lid]: value } }));

  const isFocused = (day, lid) => focus?.day === day && focus?.lid === lid;

  const laererFor = (day, lid) => laerere[day]?.[lid] || [];
  const settLaerer = (day, lid, idx, navn) => setLaerere(p => {
    const liste = [...(p[day]?.[lid] || [])];
    while (liste.length < 2) liste.push('');
    liste[idx] = navn;
    return { ...p, [day]: { ...p[day], [lid]: liste } };
  });
  const tomLaerere = (day, lid) => setLaerere(p => ({ ...p, [day]: { ...p[day], [lid]: [] } }));
  /** Parallell økt: setter lærer nr. idx (0 eller 1) for faget på plass slot */
  const settGruppeLaerer = (day, lid, slot, idx, navn) => setLaerere(p => {
    const grupper = (p[day]?.[lid] || []).map(g => (Array.isArray(g) ? [...g] : []));
    while (grupper.length <= slot) grupper.push([]);
    while (grupper[slot].length < 2) grupper[slot].push('');
    grupper[slot][idx] = navn;
    return { ...p, [day]: { ...p[day], [lid]: grupper } };
  });
  const tomGruppe = (day, lid, slot) => setLaerere(p => {
    const grupper = (p[day]?.[lid] || []).map(g => (Array.isArray(g) ? g : []));
    if (slot < grupper.length) grupper[slot] = [];
    return { ...p, [day]: { ...p[day], [lid]: grupper } };
  });
  /** Beholder bare læreren på plass idx, flyttet til første plass */
  const beholdLaerer = (day, lid, idx) => setLaerere(p => {
    const navn = p[day]?.[lid]?.[idx] || '';
    return { ...p, [day]: { ...p[day], [lid]: navn ? [navn] : [] } };
  });
  /** Enkel celle som blir delt: første lærer følger faget som står, en medlærer får ingen egen plass */
  const beholdForsteLaerer = (day, lid) => setLaerere(p => {
    const navn = (p[day]?.[lid] || []).find(n => String(n || '').trim()) || '';
    return { ...p, [day]: { ...p[day], [lid]: navn ? [navn] : [] } };
  });

  /** Alle lærernavn i timeplanen, som forslag i lærerfeltene */
  const kjenteLaerere = [...new Set(Object.values(laerere)
    .flatMap(dag => Object.values(dag || {}).flat(2))
    .map(n => String(n || '').trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'));

  /** Knappen som åpner lærerdialogen for en økt */
  const laererKnapp = (day, lid) => (
    <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); setLaererCelle({ day, lid }); setFocus(null); }}
      title="Ansvarlige lærere i økta" aria-label="Ansvarlige lærere"><Ikon navn="users" /></button>
  );

  /* ── Tegn i celle ── */
  const paint = (day, lid, slot = null) => {
    if (!erase && active === null) {
      // Ingen pensel valgt: trykk velger cella, så verktøyene vises (også på iPad)
      setFocus(f => (f?.day === day && f?.lid === lid ? null : { day, lid }));
      return;
    }
    // En tømt økt (eller plass) skal ikke ta med seg læreren hvis et nytt fag settes inn
    if (erase) {
      const rawNa = sched[day]?.[lid];
      if (isObj(rawNa) && slot !== null) {
        const plass = slot === 'a' || slot === 'even' ? 0 : slot === 'b' || slot === 'odd' ? 1 : null;
        // Mister økta sitt siste fag (også i en parallell), går lærerne med
        if (!harFag(withSlot(rawNa, slot, null))) tomLaerere(day, lid);
        else if (plass !== null) settLaerer(day, lid, plass, '');
        else if (isParallel(rawNa)) tomGruppe(day, lid, slot);
      } else {
        tomLaerere(day, lid);
      }
    }
    setSched(p => {
      const raw = p[day][lid];
      let v;
      if (erase) {
        v = (isObj(raw) && slot !== null) ? withSlot(raw, slot, null) : null;
      } else if (active !== null) {
        if (isObj(raw) && slot !== null) v = withSlot(raw, slot, active);
        else if (!isObj(raw) && slot === null) v = active;
        else return p;
      } else return p;
      return { ...p, [day]: { ...p[day], [lid]: v } };
    });
  };

  /* ── Konverter celletype ── */
  const splitCell = (day, lid) => {
    const v = sched[day][lid];
    if (isObj(v)) return;
    setCell(day, lid, { a: v, b: null });
    beholdForsteLaerer(day, lid);
  };
  const makeWeekAlt = (day, lid) => {
    const v = sched[day][lid];
    if (isObj(v)) return;
    setCell(day, lid, { type: 'week', even: v, odd: null });
    // Faget som står, går i partallsuker; læreren følger det. Oddetallsuka starter uten lærer.
    beholdForsteLaerer(day, lid);
  };
  const makeParallel = (day, lid) => {
    const v = sched[day][lid];
    if (isObj(v)) return;
    setCell(day, lid, { type: 'parallel', ids: v ? [v, null] : [null, null] });
    // Lærerne følger faget som står, og blir dets gruppe
    setLaerere(p => {
      const navn = (p[day]?.[lid] || []).filter(n => typeof n === 'string' && n.trim());
      return { ...p, [day]: { ...p[day], [lid]: navn.length ? [navn] : [] } };
    });
  };
  const mergeCell = (day, lid) => {
    const v = sched[day][lid];
    if (!isObj(v)) return;
    // Læreren følger faget som blir stående; i en parallell er lærerne likestilte
    if (isParallel(v)) {
      const idx = (v.ids || []).findIndex(Boolean);
      setCell(day, lid, idx >= 0 ? v.ids[idx] : null);
      // Faget som blir stående, beholder lærerne sine
      setLaerere(p => {
        const gruppe = idx >= 0 && Array.isArray(p[day]?.[lid]?.[idx]) ? p[day][lid][idx].filter(Boolean) : [];
        return { ...p, [day]: { ...p[day], [lid]: gruppe } };
      });
    } else {
      const [forste, andre] = isWeekAlt(v) ? [v.even, v.odd] : [v.a, v.b];
      setCell(day, lid, forste ?? andre ?? null);
      if (forste != null) beholdLaerer(day, lid, 0);
      else if (andre != null) beholdLaerer(day, lid, 1);
      else tomLaerere(day, lid);
    }
  };
  const addParallelSlot = (day, lid) => {
    const v = sched[day][lid];
    if (isParallel(v)) setCell(day, lid, { ...v, ids: [...(v.ids || []), null] });
  };
  const removeParallelSlot = (day, lid, idx) => {
    const v = sched[day][lid];
    if (!isParallel(v)) return;
    const ids = (v.ids || []).filter((_, i) => i !== idx);
    const rest = ids.length >= 2 ? { ...v, ids } : (ids[0] ?? null);
    setCell(day, lid, rest);
    if (!harFag(rest)) tomLaerere(day, lid);
    else setLaerere(p => {
      // Lærergruppa til det fjernede faget går ut; resten flytter opp sammen med fagene
      const grupper = (p[day]?.[lid] || []).filter((_, i) => i !== idx);
      return { ...p, [day]: { ...p[day], [lid]: isParallel(rest) ? grupper : (Array.isArray(grupper[0]) ? grupper[0].filter(Boolean) : []) } };
    });
  };

  /* ── Forhåndsvisning ved hover ── */
  const disp = (day, lid, slot = null) => {
    const raw = sched[day]?.[lid];
    const isH =
      hover?.day === day &&
      hover?.lid === lid &&
      (slot === null ? hover?.slot == null : hover?.slot === slot);
    if (isH && !erase && active !== null) {
      if (isObj(raw) && slot !== null) return gs(active);
      if (!isObj(raw) && slot === null) return gs(active);
    }
    const id = slotValue(raw, slot);
    return id ? gs(id) : null;
  };

  const cellCursor = active !== null || erase ? "pointer" : "default";

  /** Læreren som hører til en plass: fådelt a/b og partall/oddetall har hver sin */
  const slotLaerer = (day, lid, slot) => {
    const liste = laererFor(day, lid);
    if (typeof slot === 'number') return formatTeachers(Array.isArray(liste[slot]) ? liste[slot] : []);
    const [a = '', b = ''] = liste;
    if (slot === 'a' || slot === 'even') return a;
    if (slot === 'b' || slot === 'odd') return b;
    return '';
  };

  /* ── Render én plass i en delt/veksel/parallell-celle ── */
  const renderSlot = (day, lid, slot, label) => {
    const sub = disp(day, lid, slot);
    const erH = erase && hover?.day === day && hover?.lid === lid && hover?.slot === slot;
    const prH = !erase && active !== null && hover?.day === day && hover?.lid === lid && hover?.slot === slot;
    const cls = ['se-slot'];
    if (sub) cls.push('has-fag');
    if (erH) cls.push('is-erase');
    if (prH) cls.push('is-preview');
    return (
      <div
        key={slot}
        className={cls.join(' ')}
        style={fagVars(sub?.color, cellCursor)}
        role="button"
        tabIndex={0}
        aria-label={`${day} ${frame.find(f => f.id === lid)?.label || ''}${label ? `, ${label}` : ''}: ${sub ? sub.name : 'tom'}`}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); paint(day, lid, slot); } }}
        onClick={() => paint(day, lid, slot)}
        onMouseEnter={() => setHover({ day, lid, slot })}
        onMouseLeave={() => setHover(null)}
      >
        {label && <span className="se-slot-label">{label}</span>}
        {erH
          ? <span className="se-cell-emoji"><Ikon navn="trash-2" /></span>
          : sub
            ? <>
                <span className="se-cell-emoji"><FagSymbol verdi={sub.emoji} /></span>
                <span className="se-cell-name" title={sub.name}>{shortName(sub.name)}</span>
                {slotLaerer(day, lid, slot) && <span className="se-cell-laerer" title={slotLaerer(day, lid, slot)}>{slotLaerer(day, lid, slot)}</span>}
              </>
            : <span className="se-cell-plus">+</span>
        }
      </div>
    );
  };

  /* ── Render enkelt celle ── */
  const renderSingle = (day, lid) => {
    const sub = disp(day, lid);
    const erH = erase && hover?.day === day && hover?.lid === lid;
    const prH = !erase && active !== null && hover?.day === day && hover?.lid === lid;
    const showTools = !erase && active === null && (isFocused(day, lid) || (hover?.day === day && hover?.lid === lid));
    const cls = ['se-cell'];
    if (sub) cls.push('has-fag');
    if (erH) cls.push('is-erase');
    if (prH) cls.push('is-preview');
    if (isFocused(day, lid)) cls.push('is-focus');
    return (
      <div
        className="se-cell-wrap"
        onMouseEnter={() => setHover({ day, lid, slot: null })}
        onMouseLeave={() => setHover(null)}
      >
        <div
          className={cls.join(' ')}
          style={fagVars(sub?.color, cellCursor)}
          onClick={() => paint(day, lid)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); paint(day, lid); } }}
          aria-label={`${day} ${frame.find(f => f.id === lid)?.label || ''}: ${sub ? sub.name : 'tom'}`}
        >
          {erH
            ? <span className="se-cell-emoji"><Ikon navn="trash-2" /></span>
            : sub
              ? <>
                  <span className="se-cell-emoji"><FagSymbol verdi={sub.emoji} /></span>
                  <span className="se-cell-name">{sub.name}</span>
                  {formatTeachers(laererFor(day, lid)) && <span className="se-cell-laerer">{formatTeachers(laererFor(day, lid))}</span>}
                </>
              : <span className="se-cell-plus">+</span>
          }
        </div>
        {showTools && (
          <div className="se-cell-tools">
            {isMg && (
              <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); splitCell(day, lid); setFocus(null); }}
                title={parts ? `Del for ${parts[0]} og ${parts[1]}` : "Del cellen i to"} aria-label="Del per trinn"><Ikon navn="columns-2" /></button>
            )}
            <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); makeWeekAlt(day, lid); setFocus(null); }}
              title="Veksle mellom partalls- og oddetallsuker" aria-label="Partall og oddetall"><Ikon navn="calendar-range" /></button>
            <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); makeParallel(day, lid); setFocus(null); }}
              title="Flere fag samtidig (parallelt, på tvers av trinn)" aria-label="Flere fag samtidig"><Ikon navn="layers" /></button>
            {sched[day]?.[lid] != null && laererKnapp(day, lid)}
          </div>
        )}
      </div>
    );
  };

  /* ── Render sammensatt celle (fådelt / ukeveksling / parallell) ── */
  const renderComposite = (day, lid, raw) => {
    let slots;
    let badge;
    if (isWeekAlt(raw)) {
      slots = [renderSlot(day, lid, 'even', 'Partall'), renderSlot(day, lid, 'odd', 'Oddetall')];
      badge = "Uke";
    } else if (isParallel(raw)) {
      const count = (raw.ids || []).length;
      slots = (raw.ids || []).map((_, i) => (
        <div key={i} className="se-slot-wrap">
          {renderSlot(day, lid, i, `Valg ${i + 1}`)}
          {count > 2 && (
            <button type="button" className="se-slot-remove" onClick={e => { e.stopPropagation(); removeParallelSlot(day, lid, i); }} title="Fjern dette valget" aria-label="Fjern dette valget"><Ikon navn="x" /></button>
          )}
        </div>
      ));
      badge = "Parallelt";
    } else {
      slots = [
        renderSlot(day, lid, 'a', parts ? parts[0] : 'A'),
        renderSlot(day, lid, 'b', parts ? parts[1] : 'B'),
      ];
      badge = "Fådelt";
    }

    return (
      <div className="se-cell-wrap se-cell-composite">
        <div className="se-cell-tools is-static">
          {isParallel(raw) && (
            <button type="button" className="se-tool" onClick={() => addParallelSlot(day, lid)} title="Legg til fag i parallellen" aria-label="Legg til fag"><Ikon navn="plus" /></button>
          )}
          <button type="button" className="se-tool" onClick={() => mergeCell(day, lid)} title="Slå sammen til én celle" aria-label="Slå sammen"><Ikon navn="merge" /></button>
        </div>
        {badge && <span className="se-cell-badge">{badge}</span>}
        <div className="se-slots">{slots}</div>
        {/* Lærerne nederst, så knappene øverst ikke dekker merket «Fådelt»/«Parallelt» */}
        <button type="button" className="se-laerer-knapp" onClick={() => { setLaererCelle({ day, lid }); setFocus(null); }}
          title="Ansvarlige lærere i økta" aria-label="Ansvarlige lærere">
          <Ikon navn="users" />
          {!laererFor(day, lid).flat().some(n => String(n || '').trim()) && <span>Lærere</span>}
        </button>
      </div>
    );
  };

  /* ── Frame-editor (tidspunkter) ── */
  const fUpd = (id, k, v) => setFEdit(p => p.map(r => r.id === id ? { ...r, [k]: v } : r));
  const fRem = id => setFEdit(p => p.filter(r => r.id !== id));
  const fAdd = type => {
    const ex   = fEdit.filter(r => r.type === type);
    const maxN = ex.reduce((m, r) => Math.max(m, parseInt(r.id.slice(1)) || 0), 0);
    const id   = (type === "lesson" ? "l" : "b") + (maxN + 1);
    const label = type === "lesson"
      ? `${fEdit.filter(r => r.type === "lesson").length + 1}. time`
      : "Pause";
    const last = fEdit[fEdit.length - 1];
    setFEdit(p => [...p, { id, type, label, start: last?.end || "14:35", end: "" }]);
  };
  const fSave = () => {
    const oldL = new Set(frame.filter(r => r.type === "lesson").map(r => r.id));
    const newL = new Set(fEdit.filter(r => r.type === "lesson").map(r => r.id));
    setSched(prev => {
      const s = {};
      DAYS.forEach(day => {
        const d = { ...prev[day] };
        oldL.forEach(id => { if (!newL.has(id)) delete d[id]; });
        newL.forEach(id => { if (!oldL.has(id)) d[id] = null; });
        s[day] = d;
      });
      return s;
    });
    // Lærerne til økter som er fjernet, skal ikke dukke opp i en ny økt med samme id
    setLaerere(prev => {
      const l = {};
      DAYS.forEach(day => {
        const d = { ...(prev[day] || {}) };
        oldL.forEach(id => { if (!newL.has(id)) delete d[id]; });
        l[day] = d;
      });
      return l;
    });
    setFrame(fEdit);
    setModal(null);
  };

  /* ── Opprett ny klasse lokalt ── */
  const doCreateClass = (mg) => {
    if (!newCn.trim()) return;
    setSched(blankSched(frame));
    setLaerere(blankLaerere());
    setCn(newCn.trim());
    setIsMg(mg);
    setNewCn("");
    setModal(null);
  };

  const previewParts = parseClassParts(newCn);

  /* ── Lagre til app-state ── */
  const handleSave = () => {
    const { schedule, breaks } = buildClassDataFromEditorState(subj, sched, frame, isMg ? parts : null, laerere);
    const subjectUpdates = {};
    subj.forEach(s => { subjectUpdates[s.name] = { color: s.color, emoji: s.emoji }; });
    onSave(schedule, breaks, subjectUpdates, cn, isMg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── Hjelpetekst som følger det læreren gjør ── */
  const hint = erase
    ? 'Trykk på en økt for å fjerne faget som står der. Trykk på «Fjern fag» igjen når du er ferdig.'
    : active
      ? `Trykk på øktene der «${acSub?.name}» skal stå. Trykk på faget igjen når du er ferdig med det.`
      : 'Velg et fag, og trykk på øktene der det skal stå. Trykk på en fylt økt uten fag valgt for å dele den.';

  const gridRows = ['auto', ...frame.map(r => (r.type === 'break' ? 'auto' : 'minmax(76px, 1fr)'))].join(' ');

  /* ── Render ── */
  return (
    <div className="se">

      {/* Topplinje: tilbake, klassenavn, lagre */}
      <header className="se-header">
        <div className="se-header-left">
          <button type="button" className="k-btn k-btn--tilbake k-btn--liten" onClick={onBack}><Ikon navn="arrow-left" /> Tilbake</button>
          <span className="se-school" aria-hidden="true"><Ikon navn="school" /></span>
          {editCn
            ? <input
                className="se-input se-input-name"
                autoFocus value={cn} onChange={e => setCn(e.target.value)}
                onBlur={() => setEditCn(false)}
                onKeyDown={e => e.key === "Enter" && setEditCn(false)}
                aria-label="Klassenavn"
              />
            : <button type="button" className="se-name" onClick={() => setEditCn(true)} title="Trykk for å endre navnet">
                {cn} <span className="se-name-pen" aria-hidden="true"><Ikon navn="pencil" /></span>
              </button>
          }
          {isMg && parts && (
            <span className="se-badge">Fådelt · {parts[0]} / {parts[1]}</span>
          )}
        </div>
        <div className="se-header-right">
          <button type="button" className="k-btn k-btn--hjelp k-btn--liten" onClick={() => setHjelp(true)} aria-haspopup="dialog">
            <Ikon navn="circle-help" /> Slik bruker du timeplanen
          </button>
          <button type="button" className={`k-btn k-btn--ny k-btn--fylt${saved ? ' is-saved' : ''}`} onClick={handleSave}>
            {saved ? <><Ikon navn="check" /> Lagret</> : "Lagre timeplanen"}
          </button>
        </div>
      </header>

      {/* Verktøy, gruppert etter hva de virker på */}
      <div className="se-toolbar">
        <section className="se-group">
          <h3 className="k-group-title">Klasse</h3>
          <div className="se-group-row">
            <button type="button" className="k-btn k-btn--ny k-btn--liten" onClick={() => { setNewCn(""); setModal("newClass"); }}>+ Ny klasse</button>
            <button type="button" className="k-btn k-btn--ny k-btn--liten" onClick={() => { setNewCn(""); setModal("newMgClass"); }}>+ Ny fådelt klasse</button>
          </div>
        </section>
        <section className="se-group">
          <h3 className="k-group-title">Skoledagen</h3>
          <div className="se-group-row">
            <button type="button" className="k-btn k-btn--rediger k-btn--liten" onClick={() => { setFEdit(JSON.parse(JSON.stringify(frame))); setModal("frame"); }}>
              <Ikon navn="clock" /> Tider og pauser
            </button>
          </div>
        </section>
        <section className="se-group">
          <h3 className="k-group-title">Økter</h3>
          <div className="se-group-row">
            <button
              type="button"
              className={`k-btn k-btn--slett k-btn--liten${erase ? ' k-btn--fylt' : ''}`}
              aria-pressed={erase}
              title="Slå på, og trykk så på øktene du vil tømme"
              onClick={() => { setErase(e => !e); setActive(null); setFocus(null); }}
            >
              <Ikon navn="trash-2" /> {erase ? "Fjerner fag: trykk på økta" : "Fjern fag"}
            </button>
          </div>
        </section>
      </div>

      <div className="se-main">
        {/* Rutenettet */}
        <div className="se-grid-wrap">
          <div className="se-grid" style={{ gridTemplateRows: gridRows }} role="group" aria-label="Timeplan">
            <div className="se-corner" />
            {DAYS.map((d, i) => (
              <div key={d} className="se-day"><span className="se-day-long">{d}</span><span className="se-day-short">{DAYS_S[i]}</span></div>
            ))}
            {frame.map(row => row.type === "break"
              ? [
                  <div key={`${row.id}-t`} className="se-time se-time-break">{row.start}–{row.end}</div>,
                  <div key={`${row.id}-b`} className="se-break">{row.label}</div>,
                ]
              : [
                  <div key={`${row.id}-t`} className="se-time">
                    <span className="se-time-label">{row.label}</span>
                    <span className="se-time-range">{row.start}–{row.end}</span>
                  </div>,
                  ...DAYS.map(day => {
                    const raw = sched[day]?.[row.id];
                    return (
                      <div key={`${row.id}-${day}`} className="se-td">
                        {isObj(raw) ? renderComposite(day, row.id, raw) : renderSingle(day, row.id)}
                      </div>
                    );
                  }),
                ]
            )}
          </div>
        </div>

        {/* Fagpaletten */}
        <aside className="se-side">
          <Info felt id="se-hint">{hint}</Info>
          <h3 className="k-group-title">Fag</h3>
          <div className="se-palette">
            {subj.map(s => (
              <div key={s.id} className={`se-chip-wrap${active === s.id ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="se-chip"
                  style={fagVars(s.color)}
                  aria-pressed={active === s.id}
                  onClick={() => { setActive(p => p === s.id ? null : s.id); setErase(false); setFocus(null); }}
                >
                  <span className="se-chip-emoji"><FagSymbol verdi={s.emoji} /></span>
                  <span className="se-chip-name">{s.name}</span>
                </button>
                <button type="button" className="se-chip-edit" onClick={() => setEditSj(s.id)} title={`Rediger ${s.name}`} aria-label={`Rediger ${s.name}`}><Ikon navn="pencil" /></button>
              </div>
            ))}
            <button type="button" className="se-chip se-chip-new" onClick={() => setModal("newSubj")}>+ Nytt fag</button>
          </div>
        </aside>
      </div>

      {/* SLIK BRUKER DU TIMEPLANEN */}
      {hjelp && (
        <Dialog onClose={() => setHjelp(false)} title="Slik bruker du timeplanen" bred>
          <ol className="hjelp-steg">
            <li>Velg et fag i lista til høyre, eller lag et nytt med «+ Nytt fag».</li>
            <li>Trykk på øktene der faget skal stå. Trykk på faget igjen når du er ferdig med det.</li>
            <li>Skal et fag bort? Slå på «Fjern fag» og trykk på økta.</li>
            <li>Trykk «Lagre timeplanen» til slutt. Fram til da er ingenting endret på skjermen.</li>
          </ol>
          <h3 className="hjelp-tittel">Symbolene på en økt</h3>
          <Info>Symbolene vises når du holder over eller trykker på en fylt økt uten at et fag er valgt.</Info>
          <dl className="se-legend">
            <div><dt><Ikon navn="columns-2" /></dt><dd>Del økta per trinn (fådelt klasse)</dd></div>
            <div><dt><Ikon navn="calendar-range" /></dt><dd>Ulike fag i partalls- og oddetallsuker</dd></div>
            <div><dt><Ikon navn="layers" /></dt><dd>Flere fag samtidig (parallell)</dd></div>
            <div><dt><Ikon navn="merge" /></dt><dd>Slå sammen igjen</dd></div>
            <div><dt><Ikon navn="users" /></dt><dd>Ansvarlige lærere, inntil to per økt</dd></div>
            <div><dt><Ikon navn="plus" /></dt><dd>Ett fag til i parallellen</dd></div>
            <div><dt><Ikon navn="x" /></dt><dd>Fjern et valg</dd></div>
          </dl>
          <h3 className="hjelp-tittel">Farger</h3>
          <Info>Fagfargene brukes også på tidslinjen, hovedskjermen og nedtellingsskiva, og symbolet vises på tidslinjen. Trykk på blyanten ved et fag for å endre dem.</Info>
          <div className="k-dialog-actions">
            <button type="button" className="k-btn k-btn--tilbake" onClick={() => setHjelp(false)}>Lukk</button>
          </div>
        </Dialog>
      )}

      {/* LÆRERE I ØKTA */}
      {laererCelle && (() => {
        const { day, lid } = laererCelle;
        const raw = sched[day]?.[lid];
        const etiketter = laererEtiketter(raw, parts);
        const okt = frame.find(f => f.id === lid);
        const [a = '', b = ''] = laererFor(day, lid);
        const felt = (id, etikett, verdi, onChange, forst) => (
          <label key={id} className="se-field">
            <span>{etikett}</span>
            <input
              className="se-input"
              id={id}
              list="se-kjente-laerere"
              autoFocus={forst}
              maxLength={40}
              autoComplete="off"
              placeholder="Navn"
              value={verdi}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setLaererCelle(null); }}
            />
          </label>
        );
        if (isParallel(raw)) {
          const grupper = laererFor(day, lid);
          return (
            <Dialog onClose={() => setLaererCelle(null)} title={`Lærere ${day.toLowerCase()} ${okt?.label || ''}`.trim()}>
              <Info>Fagene går samtidig. Hvert fag kan ha inntil to ansvarlige lærere.</Info>
              <datalist id="se-kjente-laerere">
                {kjenteLaerere.map(n => <option key={n} value={n} />)}
              </datalist>
              {(raw.ids || []).map((id, slot) => {
                const fag = gs(id);
                const [g1 = '', g2 = ''] = Array.isArray(grupper[slot]) ? grupper[slot] : [];
                return (
                  <fieldset key={slot} className="se-laerer-gruppe">
                    <legend>{fag ? fag.name : `Valg ${slot + 1} (uten fag)`}</legend>
                    <div className="se-field-row">
                      {felt(`se-laerer-${slot + 1}-1`, 'Lærer 1', g1, v => settGruppeLaerer(day, lid, slot, 0, v), slot === 0)}
                      {felt(`se-laerer-${slot + 1}-2`, 'Lærer 2', g2, v => settGruppeLaerer(day, lid, slot, 1, v), false)}
                    </div>
                  </fieldset>
                );
              })}
              <div className="se-modal-actions">
                <button type="button" className="k-btn k-btn--ny" onClick={() => setLaererCelle(null)}>Ferdig</button>
                <button type="button" className="k-btn k-btn--slett" onClick={() => { tomLaerere(day, lid); setLaererCelle(null); }}>Fjern lærerne</button>
              </div>
            </Dialog>
          );
        }
        return (
          <Dialog onClose={() => setLaererCelle(null)} title={`Lærere ${day.toLowerCase()} ${okt?.label || ''}`.trim()}>
            <Info>
              {isWeekAlt(raw)
                ? 'Skriv læreren i partallsuker og i oddetallsuker. Navnet vises på skjermen den uka faget går.'
                : isSplit(raw)
                  ? 'Skriv læreren for hvert trinn. La et felt stå tomt hvis trinnet ikke har egen lærer.'
                  : 'Inntil to ansvarlige lærere. Navnene vises under faget på skjermen.'}
            </Info>
            <datalist id="se-kjente-laerere">
              {kjenteLaerere.map(n => <option key={n} value={n} />)}
            </datalist>
            {[a, b].map((verdi, i) => felt(`se-laerer-${i + 1}`, etiketter[i], verdi, v => settLaerer(day, lid, i, v), i === 0))}
            <div className="se-modal-actions">
              <button type="button" className="k-btn k-btn--ny" onClick={() => setLaererCelle(null)}>Ferdig</button>
              <button type="button" className="k-btn k-btn--slett" onClick={() => { setLaerere(p => ({ ...p, [day]: { ...p[day], [lid]: [] } })); setLaererCelle(null); }}>Fjern lærerne</button>
            </div>
          </Dialog>
        );
      })()}

      {/* REDIGER FAG */}
      {editSj !== null && (() => {
        const s = subj.find(x => x.id === editSj);
        if (!s) return null;
        const upd = (k, v) => setSubj(p => p.map(x => x.id === editSj ? { ...x, [k]: v } : x));
        return (
          <Dialog onClose={() => setEditSj(null)} title={`Rediger ${s.name}`}>
            <label className="se-field">
              <span>Fagnavn</span>
              <input className="se-input" value={s.name} onChange={e => upd("name", e.target.value)} placeholder="Fagnavn" />
            </label>
            <SymbolVelger value={s.emoji} onPick={v => upd("emoji", v)} reserve="book-open" />
            <div className="se-field-row">
              <label className="se-field">
                <span>Farge</span>
                <span className="se-color-row">
                  <input type="color" className="se-color" value={s.color} onChange={e => upd("color", e.target.value)} />
                  <code>{s.color}</code>
                </span>
              </label>
            </div>
            <div className="se-modal-actions">
              <button type="button" className="k-btn k-btn--ny" onClick={() => setEditSj(null)}>Ferdig</button>
              <button type="button" className="k-btn k-btn--slett" onClick={() => { setSubj(p => p.filter(x => x.id !== editSj)); setEditSj(null); }}>Slett fag</button>
            </div>
          </Dialog>
        );
      })()}

      {/* NYTT FAG */}
      {modal === "newSubj" && (
        <Dialog onClose={() => setModal(null)} title="Nytt fag">
          <label className="se-field">
            <span>Fagnavn</span>
            <input className="se-input" autoFocus placeholder="Fagnavn" value={newSj.name} onChange={e => setNewSj(p => ({ ...p, name: e.target.value }))} />
          </label>
          <SymbolVelger value={newSj.emoji} onPick={v => setNewSj(p => ({ ...p, emoji: v }))} reserve="book-open" />
          <div className="se-field-row">
            <label className="se-field">
              <span>Farge</span>
              <span className="se-color-row">
                <input type="color" className="se-color" value={newSj.color} onChange={e => setNewSj(p => ({ ...p, color: e.target.value }))} />
                <code>{newSj.color}</code>
              </span>
            </label>
          </div>
          <Info>Fargen brukes på tidslinjen, hovedskjermen og nedtellingsskiva. Velg en som skiller seg fra de andre fagene.</Info>
          <div className="se-modal-actions">
            <button
              type="button"
              className="k-btn k-btn--ny"
              onClick={() => {
                if (!newSj.name.trim()) return;
                const id = Math.max(...subj.map(s => s.id), 0) + 1;
                setSubj(p => [...p, { id, ...newSj }]);
                setActive(id);
                setErase(false);
                setModal(null);
                setNewSj({ name: "", emoji: "book-open", color: "#4A90E2" });
              }}
            >Legg til</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Dialog>
      )}

      {/* NY VANLIG KLASSE */}
      {modal === "newClass" && (
        <Dialog onClose={() => setModal(null)} title="Ny klasse">
          <Info>Skriv trinn eller klassenavn, for eksempel «8A». Timeplanen starter tom.</Info>
          <label className="se-field">
            <span>Navn</span>
            <input className="se-input" autoFocus placeholder="f.eks. 8A" value={newCn} onChange={e => setNewCn(e.target.value)} onKeyDown={e => e.key === "Enter" && doCreateClass(false)} />
          </label>
          <div className="se-modal-actions">
            <button type="button" className="k-btn k-btn--ny" onClick={() => doCreateClass(false)}>Opprett</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Dialog>
      )}

      {/* NY FÅDELT KLASSE */}
      {modal === "newMgClass" && (
        <Dialog onClose={() => setModal(null)} title="Ny fådelt klasse">
          <Info>Skriv begge trinnene i navnet, for eksempel «6. og 7.». Da kan hver time deles per trinn.</Info>
          <label className="se-field">
            <span>Navn</span>
            <input
              className="se-input"
              autoFocus
              placeholder='f.eks. «6. og 7.» eller «5 og 6 trinn»'
              value={newCn}
              onChange={e => setNewCn(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doCreateClass(true)}
            />
          </label>
          <div className="se-preview">
            {newCn.trim() && (
              previewParts
                ? <span className="se-preview-ok"><Ikon navn="check" /> Gjenkjent: <b>{previewParts[0]}</b> og <b>{previewParts[1]}</b></span>
                : <span className="se-preview-warn"><Ikon navn="triangle-alert" /> Fant ikke to trinn. Delcellene merkes A / B.</span>
            )}
          </div>
          <div className="se-modal-actions">
            <button type="button" className="k-btn k-btn--ny" onClick={() => doCreateClass(true)}>Opprett</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Dialog>
      )}

      {/* TIDER OG PAUSER */}
      {modal === "frame" && fEdit && (
        <Dialog onClose={() => setModal(null)} title="Tider og pauser">
          <Info>T er time og P er pause. Endre navn og klokkeslett, eller legg til og fjern rader.</Info>
          <div className="se-frames">
            {fEdit.map(row => (
              <div key={row.id} className={`se-frame-row${row.type === 'lesson' ? ' is-lesson' : ''}`}>
                <span className="se-frame-type" aria-label={row.type === "lesson" ? "Time" : "Pause"}>{row.type === "lesson" ? "T" : "P"}</span>
                <input className="se-input" value={row.label} onChange={e => fUpd(row.id, "label", e.target.value)} aria-label="Navn" />
                <input className="se-input se-input-time" value={row.start} onChange={e => fUpd(row.id, "start", e.target.value)} placeholder="08:30" aria-label="Fra" />
                <span className="se-frame-dash">–</span>
                <input className="se-input se-input-time" value={row.end} onChange={e => fUpd(row.id, "end", e.target.value)} placeholder="09:30" aria-label="Til" />
                <button type="button" className="se-frame-remove" onClick={() => fRem(row.id)} aria-label={`Fjern ${row.label}`}><Ikon navn="x" /></button>
              </div>
            ))}
          </div>
          <div className="se-frame-add">
            <button type="button" className="k-btn k-btn--liten" onClick={() => fAdd("lesson")}>+ Time</button>
            <button type="button" className="k-btn k-btn--liten" onClick={() => fAdd("break")}>+ Pause</button>
          </div>
          <div className="se-modal-actions">
            <button type="button" className="k-btn k-btn--ny" onClick={fSave}>Bruk tidene</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
