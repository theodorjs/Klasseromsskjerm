import { useState, useEffect } from "react";
import Info from './Info.jsx';
import { isClassMultiGrade } from '../utils/schedule.js';
import { getMinutesFromTime } from '../utils/time.js';
import { getSubject } from '../data/subjects.js';

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
      emoji: emoji || '📚',
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

  return { subj, sched, isMg, cn: currentClassName };
}

/* ─── Konvertering: editor-state → classData.schedule + breaks ─ */

/**
 * Returnerer { schedule, breaks } klare til å lagres i klassedata.
 * b2-blokken (Lunsj & Storefri) splittes tilbake til «Mat» + «Storefri».
 */
function buildClassDataFromEditorState(subjects, sched, frames, gradeLabels = null) {
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
      const base = { time: frame.start, end: frame.end };

      // Ukeveksling -> to oppforinger med hver sin weekParity
      if (isWeekAlt(raw)) {
        const evenName = nameOf(raw.even);
        const oddName  = nameOf(raw.odd);
        if (evenName) schedule[day].push({ ...base, activity: evenName, weekParity: 'partall' });
        if (oddName)  schedule[day].push({ ...base, activity: oddName,  weekParity: 'oddetall' });
        return;
      }

      // Parallelle fag -> en oppforing med flagg
      if (isParallel(raw)) {
        const names = (raw.ids || []).map(nameOf).filter(Boolean);
        if (!names.length) return;
        schedule[day].push({ ...base, activity: names.join(' / '), parallel: true });
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

/* ─── Overlay-modal (instrumentpanel) ───────────────────── */

const Overlay = ({ onClose, children, title }) => (
  <div className="se-overlay" onClick={onClose}>
    <div className="se-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

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
  const [newSj,  setNewSj]  = useState({ name: "", emoji: "📚", color: "#4A90E2" });
  const [newCn,  setNewCn]  = useState("");

  /* ── Initialiser fra eksisterende klassedata ── */
  useEffect(() => {
    if (!currentClass) return;
    const { subj: s, sched: sc, isMg: mg, cn: name } =
      buildEditorStateFromClass(currentClass, currentClassName, SUBJ0);
    setSubj(s);
    setSched(sc);
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

  /* ── Tegn i celle ── */
  const paint = (day, lid, slot = null) => {
    if (!erase && active === null) {
      // Ingen pensel valgt: trykk velger cella, så verktøyene vises (også på iPad)
      setFocus(f => (f?.day === day && f?.lid === lid ? null : { day, lid }));
      return;
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
    if (!isObj(v)) setCell(day, lid, { a: v, b: null });
  };
  const makeWeekAlt = (day, lid) => {
    const v = sched[day][lid];
    if (!isObj(v)) setCell(day, lid, { type: 'week', even: v, odd: null });
  };
  const makeParallel = (day, lid) => {
    const v = sched[day][lid];
    if (!isObj(v)) setCell(day, lid, { type: 'parallel', ids: v ? [v, null] : [null, null] });
  };
  const mergeCell = (day, lid) => {
    const v = sched[day][lid];
    if (!isObj(v)) return;
    if (isParallel(v))     setCell(day, lid, v.ids?.find(Boolean) ?? null);
    else if (isWeekAlt(v)) setCell(day, lid, v.even ?? v.odd ?? null);
    else                   setCell(day, lid, v.a ?? v.b ?? null);
  };
  const addParallelSlot = (day, lid) => {
    const v = sched[day][lid];
    if (isParallel(v)) setCell(day, lid, { ...v, ids: [...(v.ids || []), null] });
  };
  const removeParallelSlot = (day, lid, idx) => {
    const v = sched[day][lid];
    if (!isParallel(v)) return;
    const ids = (v.ids || []).filter((_, i) => i !== idx);
    setCell(day, lid, ids.length >= 2 ? { ...v, ids } : (ids[0] ?? null));
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
          ? <span className="se-cell-emoji">🗑</span>
          : sub
            ? <>
                <span className="se-cell-emoji">{sub.emoji}</span>
                <span className="se-cell-name" title={sub.name}>{shortName(sub.name)}</span>
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
            ? <span className="se-cell-emoji">🗑</span>
            : sub
              ? <>
                  <span className="se-cell-emoji">{sub.emoji}</span>
                  <span className="se-cell-name">{sub.name}</span>
                </>
              : <span className="se-cell-plus">+</span>
          }
        </div>
        {showTools && (
          <div className="se-cell-tools">
            {isMg && (
              <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); splitCell(day, lid); setFocus(null); }}
                title={parts ? `Del for ${parts[0]} og ${parts[1]}` : "Del cellen i to"} aria-label="Del per trinn">◫</button>
            )}
            <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); makeWeekAlt(day, lid); setFocus(null); }}
              title="Veksle mellom partalls- og oddetallsuker" aria-label="Partall og oddetall">🗓</button>
            <button type="button" className="se-tool" onClick={e => { e.stopPropagation(); makeParallel(day, lid); setFocus(null); }}
              title="Flere fag samtidig (parallelt, på tvers av trinn)" aria-label="Flere fag samtidig">⇉</button>
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
            <button type="button" className="se-slot-remove" onClick={e => { e.stopPropagation(); removeParallelSlot(day, lid, i); }} title="Fjern dette valget" aria-label="Fjern dette valget">✕</button>
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
            <button type="button" className="se-tool" onClick={() => addParallelSlot(day, lid)} title="Legg til fag i parallellen" aria-label="Legg til fag">+</button>
          )}
          <button type="button" className="se-tool" onClick={() => mergeCell(day, lid)} title="Slå sammen til én celle" aria-label="Slå sammen">⊟</button>
        </div>
        {badge && <span className="se-cell-badge">{badge}</span>}
        <div className="se-slots">{slots}</div>
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
    setFrame(fEdit);
    setModal(null);
  };

  /* ── Opprett ny klasse lokalt ── */
  const doCreateClass = (mg) => {
    if (!newCn.trim()) return;
    setSched(blankSched(frame));
    setCn(newCn.trim());
    setIsMg(mg);
    setNewCn("");
    setModal(null);
  };

  const previewParts = parseClassParts(newCn);

  /* ── Lagre til app-state ── */
  const handleSave = () => {
    const { schedule, breaks } = buildClassDataFromEditorState(subj, sched, frame, isMg ? parts : null);
    const subjectUpdates = {};
    subj.forEach(s => { subjectUpdates[s.name] = { color: s.color, emoji: s.emoji }; });
    onSave(schedule, breaks, subjectUpdates, cn, isMg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── Hjelpetekst som følger det læreren gjør ── */
  const hint = erase
    ? 'Viskelæret er på: trykk på en celle for å tømme den.'
    : active
      ? `Trykk på cellene som skal ha «${acSub?.name}». Trykk på faget igjen for å legge fra deg penselen.`
      : 'Velg et fag, og trykk så på cellene. Trykk på en fylt celle uten fag valgt for å dele den.';

  const gridRows = ['auto', ...frame.map(r => (r.type === 'break' ? 'auto' : 'minmax(76px, 1fr)'))].join(' ');

  /* ── Render ── */
  return (
    <div className="se">

      {/* Topplinje: tilbake, klassenavn, lagre */}
      <header className="se-header">
        <div className="se-header-left">
          <button type="button" className="k-btn k-btn--tilbake k-btn--liten" onClick={onBack}>← Tilbake</button>
          <span className="se-school" aria-hidden="true">🏫</span>
          {editCn
            ? <input
                className="se-input se-input-name"
                autoFocus value={cn} onChange={e => setCn(e.target.value)}
                onBlur={() => setEditCn(false)}
                onKeyDown={e => e.key === "Enter" && setEditCn(false)}
                aria-label="Klassenavn"
              />
            : <button type="button" className="se-name" onClick={() => setEditCn(true)} title="Trykk for å endre navnet">
                {cn} <span className="se-name-pen" aria-hidden="true">✎</span>
              </button>
          }
          {isMg && parts && (
            <span className="se-badge">Fådelt · {parts[0]} / {parts[1]}</span>
          )}
        </div>
        <div className="se-header-right">
          <button type="button" className={`k-btn k-btn--ny k-btn--fylt${saved ? ' is-saved' : ''}`} onClick={handleSave}>
            {saved ? "✓ Lagret" : "Lagre timeplanen"}
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
              🕗 Tider og pauser
            </button>
          </div>
        </section>
        <section className="se-group">
          <h3 className="k-group-title">Male</h3>
          <div className="se-group-row">
            <button
              type="button"
              className={`k-btn k-btn--slett k-btn--liten${erase ? ' k-btn--fylt' : ''}`}
              aria-pressed={erase}
              title="Viskelæret tømmer cellene du trykker på"
              onClick={() => { setErase(e => !e); setActive(null); setFocus(null); }}
            >
              🧽 {erase ? "Viskelæret er på" : "Viskelær"}
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
                  <span className="se-chip-emoji">{s.emoji}</span>
                  <span className="se-chip-name">{s.name}</span>
                </button>
                <button type="button" className="se-chip-edit" onClick={() => setEditSj(s.id)} title={`Rediger ${s.name}`} aria-label={`Rediger ${s.name}`}>✎</button>
              </div>
            ))}
            <button type="button" className="se-chip se-chip-new" onClick={() => setModal("newSubj")}>+ Nytt fag</button>
          </div>
          <Info felt>{hint}</Info>
          <dl className="se-legend">
            <div><dt>◫</dt><dd>Del per trinn (fådelt)</dd></div>
            <div><dt>🗓</dt><dd>Partalls- og oddetallsuker</dd></div>
            <div><dt>⇉</dt><dd>Flere fag samtidig</dd></div>
            <div><dt>⊟</dt><dd>Slå sammen igjen</dd></div>
            <div><dt>+</dt><dd>Ett fag til i parallellen</dd></div>
            <div><dt>✕</dt><dd>Fjern et valg</dd></div>
          </dl>
          <Info>Fagfarger og emoji brukes også på tidslinjen og hovedskjermen.</Info>
        </aside>
      </div>

      {/* REDIGER FAG */}
      {editSj !== null && (() => {
        const s = subj.find(x => x.id === editSj);
        if (!s) return null;
        const upd = (k, v) => setSubj(p => p.map(x => x.id === editSj ? { ...x, [k]: v } : x));
        return (
          <Overlay onClose={() => setEditSj(null)} title={`Rediger ${s.name}`}>
            <h3 className="se-modal-title">Rediger: {s.name}</h3>
            <label className="se-field">
              <span>Fagnavn</span>
              <input className="se-input" value={s.name} onChange={e => upd("name", e.target.value)} placeholder="Fagnavn" />
            </label>
            <div className="se-field-row">
              <label className="se-field se-field-emoji">
                <span>Emoji</span>
                <input className="se-input" value={s.emoji} onChange={e => upd("emoji", e.target.value)} placeholder="😀" />
              </label>
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
          </Overlay>
        );
      })()}

      {/* NYTT FAG */}
      {modal === "newSubj" && (
        <Overlay onClose={() => setModal(null)} title="Nytt fag">
          <h3 className="se-modal-title">Nytt fag</h3>
          <label className="se-field">
            <span>Fagnavn</span>
            <input className="se-input" autoFocus placeholder="Fagnavn" value={newSj.name} onChange={e => setNewSj(p => ({ ...p, name: e.target.value }))} />
          </label>
          <div className="se-field-row">
            <label className="se-field se-field-emoji">
              <span>Emoji</span>
              <input className="se-input" placeholder="😀" value={newSj.emoji} onChange={e => setNewSj(p => ({ ...p, emoji: e.target.value }))} />
            </label>
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
                setNewSj({ name: "", emoji: "📚", color: "#4A90E2" });
              }}
            >Legg til</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Overlay>
      )}

      {/* NY VANLIG KLASSE */}
      {modal === "newClass" && (
        <Overlay onClose={() => setModal(null)} title="Ny klasse">
          <h3 className="se-modal-title">Ny klasse</h3>
          <Info>Skriv trinn eller klassenavn, for eksempel «8A». Timeplanen starter tom.</Info>
          <label className="se-field">
            <span>Navn</span>
            <input className="se-input" autoFocus placeholder="f.eks. 8A" value={newCn} onChange={e => setNewCn(e.target.value)} onKeyDown={e => e.key === "Enter" && doCreateClass(false)} />
          </label>
          <div className="se-modal-actions">
            <button type="button" className="k-btn k-btn--ny" onClick={() => doCreateClass(false)}>Opprett</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Overlay>
      )}

      {/* NY FÅDELT KLASSE */}
      {modal === "newMgClass" && (
        <Overlay onClose={() => setModal(null)} title="Ny fådelt klasse">
          <h3 className="se-modal-title">Ny fådelt klasse</h3>
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
                ? <span className="se-preview-ok">✓ Gjenkjent: <b>{previewParts[0]}</b> og <b>{previewParts[1]}</b></span>
                : <span className="se-preview-warn">⚠ Fant ikke to trinn. Delcellene merkes A / B.</span>
            )}
          </div>
          <div className="se-modal-actions">
            <button type="button" className="k-btn k-btn--ny" onClick={() => doCreateClass(true)}>Opprett</button>
            <button type="button" className="k-btn" onClick={() => setModal(null)}>Avbryt</button>
          </div>
        </Overlay>
      )}

      {/* TIDER OG PAUSER */}
      {modal === "frame" && fEdit && (
        <Overlay onClose={() => setModal(null)} title="Tider og pauser">
          <h3 className="se-modal-title">Tider og pauser</h3>
          <Info>T er time og P er pause. Endre navn og klokkeslett, eller legg til og fjern rader.</Info>
          <div className="se-frames">
            {fEdit.map(row => (
              <div key={row.id} className={`se-frame-row${row.type === 'lesson' ? ' is-lesson' : ''}`}>
                <span className="se-frame-type" aria-label={row.type === "lesson" ? "Time" : "Pause"}>{row.type === "lesson" ? "T" : "P"}</span>
                <input className="se-input" value={row.label} onChange={e => fUpd(row.id, "label", e.target.value)} aria-label="Navn" />
                <input className="se-input se-input-time" value={row.start} onChange={e => fUpd(row.id, "start", e.target.value)} placeholder="08:30" aria-label="Fra" />
                <span className="se-frame-dash">–</span>
                <input className="se-input se-input-time" value={row.end} onChange={e => fUpd(row.id, "end", e.target.value)} placeholder="09:30" aria-label="Til" />
                <button type="button" className="se-frame-remove" onClick={() => fRem(row.id)} aria-label={`Fjern ${row.label}`}>✕</button>
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
        </Overlay>
      )}
    </div>
  );
}
