import { useState, useEffect } from "react";
import { isClassMultiGrade } from '../utils/schedule.js';
import { getMinutesFromTime } from '../utils/time.js';
import { colorMap } from '../data/constants.js';

/* ─── Konstanter ─────────────────────────────────────────── */

const DAYS_S = ["Man.","Tir.","Ons.","Tor.","Fre."];
const DAYS   = ["Mandag","Tirsdag","Onsdag","Torsdag","Fredag"];
const isSplit = v => v !== null && typeof v === "object";

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

const SUBJ0 = [
  {id:1,  name:"Norsk",            emoji:"📝", color: colorMap["Norsk"]             ?? "#EE4C17"},
  {id:2,  name:"Matematikk",       emoji:"🔢", color: colorMap["Matematikk"]        ?? "#1384CF"},
  {id:3,  name:"Engelsk",          emoji:"🌍", color: colorMap["Engelsk"]           ?? "#FF772E"},
  {id:4,  name:"Naturfag",         emoji:"🔬", color: colorMap["Naturfag"]          ?? "#1A963B"},
  {id:5,  name:"Samfunnsfag",      emoji:"🗺️", color: colorMap["Samfunnsfag"]       ?? "#E59C1F"},
  {id:6,  name:"KRLE",             emoji:"✨", color: colorMap["KRLE"]              ?? "#AA3AB8"},
  {id:7,  name:"Kunst og håndverk",emoji:"🎨", color: colorMap["Kunst og håndverk"] ?? "#9933FF"},
  {id:8,  name:"Musikk",           emoji:"🎵", color: colorMap["Musikk"]            ?? "#C63398"},
  {id:9,  name:"Kroppsøving",      emoji:"⚽", color: colorMap["Kroppsøving"]       ?? "#00CC00"},
  {id:10, name:"Valgfag",          emoji:"🎯", color: colorMap["Valgfag"]           ?? "#7E2EAA"},
  {id:11, name:"Leksehjelp",       emoji:"📚", color: colorMap["Leksehjelp"]        ?? "#0A8F7A"},
  {id:12, name:"Språkfag",         emoji:"💬", color: colorMap["Språkfag"]          ?? "#F08A24"},
];

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

function buildEditorStateFromClass(currentClass, currentClassName, baseSubj) {
  const isMg = isClassMultiGrade(currentClass);
  const lessonFrames = FRAME0.filter(f => f.type === "lesson");

  // Berik fag-lista med eventuelle lagrede farger/emojier
  const subj = baseSubj.map(s => ({
    ...s,
    color: currentClass?.subjectColors?.[s.name] || s.color,
    emoji: currentClass?.subjectEmojis?.[s.name] || s.emoji,
  }));

  /** Finn fag-ID ved navn (ignorer stor/liten + trinn-suffiks) */
  const findId = (rawName) => {
    const base = stripGrade(rawName).toLowerCase();
    const found = subj.find(s =>
      s.name.toLowerCase() === base ||
      s.name.toLowerCase() === rawName.toLowerCase()
    );
    return found?.id ?? null;
  };

  const sched = blankSched(FRAME0);
  DAYS.forEach(day => {
    const entries = [...(currentClass?.schedule?.[day] || [])]
      .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));

    entries.forEach((entry, i) => {
      if (i >= lessonFrames.length) return;
      const fid = lessonFrames[i].id;
      const act = entry.activity || '';

      if (act.includes('/') && isMg) {
        const [rawA, rawB] = act.split('/').map(s => s.trim());
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
function buildClassDataFromEditorState(subjects, sched, frames) {
  const schedule = {};
  const breaks   = {};

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

      let activity;
      if (isSplit(raw)) {
        const sA = raw.a ? subjects.find(s => s.id === raw.a) : null;
        const sB = raw.b ? subjects.find(s => s.id === raw.b) : null;
        if (!sA?.name && !sB?.name) return;
        activity = sA?.name && sB?.name
          ? `${sA.name} / ${sB.name}`
          : (sA?.name || sB?.name);
      } else {
        const found = subjects.find(s => s.id === raw);
        if (!found) return;
        activity = found.name;
      }

      schedule[day].push({ time: frame.start, end: frame.end, activity });
    });
  });

  return { schedule, breaks };
}

/* ─── Hjelpestiler ───────────────────────────────────────── */

const inp = (ex = {}) => ({
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "8px",
  padding: "7px 10px",
  color: "white",
  fontSize: "0.85rem",
  boxSizing: "border-box",
  outline: "none",
  ...ex,
});

/* ─── Overlay-modal ──────────────────────────────────────── */

const Overlay = ({ onClose, children }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: "16px",
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: "#1c2a3a", borderRadius: "16px", padding: "22px",
        width: "100%", maxWidth: "400px",
        border: "1px solid rgba(255,255,255,0.12)",
        maxHeight: "84vh", overflowY: "auto",
      }}
    >
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
  themeMode = 2,  // 0=lys, 1=mørk, 2=stjerne, 3=fargerik
}) {
  const [subj,   setSubj]   = useState(SUBJ0);
  const [sched,  setSched]  = useState(() => blankSched(FRAME0));
  const [frame,  setFrame]  = useState(FRAME0);
  const [active, setActive] = useState(null);
  const [erase,  setErase]  = useState(false);
  const [hover,  setHover]  = useState(null);
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
  const acCol = acSub?.color || "rgba(255,255,255,0.4)";

  /* ── Tegn i celle ── */
  const paint = (day, lid, half = null) => {
    setSched(p => {
      const raw = p[day][lid];
      let v;
      if (erase) {
        v = isSplit(raw) && half ? { ...raw, [half]: null } : null;
      } else if (active !== null) {
        if (isSplit(raw) && half) v = { ...raw, [half]: active };
        else if (!isSplit(raw) && half === null) v = active;
        else return p;
      } else return p;
      return { ...p, [day]: { ...p[day], [lid]: v } };
    });
  };

  const splitCell = (day, lid) => {
    const v = sched[day][lid];
    if (!isSplit(v)) setSched(p => ({ ...p, [day]: { ...p[day], [lid]: { a: v, b: null } } }));
  };
  const mergeCell = (day, lid) => {
    const v = sched[day][lid];
    if (isSplit(v)) setSched(p => ({ ...p, [day]: { ...p[day], [lid]: v.a } }));
  };

  /* ── Forhåndsvisning ved hover ── */
  const disp = (day, lid, half = null) => {
    const raw = sched[day]?.[lid];
    const isH =
      hover?.day === day &&
      hover?.lid === lid &&
      (half === null || hover?.half === half);
    if (isH && !erase && active !== null) {
      if (isSplit(raw) && half) return gs(active);
      if (!isSplit(raw) && half === null) return gs(active);
    }
    if (isSplit(raw)) return half ? (raw[half] ? gs(raw[half]) : null) : null;
    return raw ? gs(raw) : null;
  };

  /* ── Render delt celle-halvdel ── */
  const renderHalf = (day, lid, half) => {
    const sub = disp(day, lid, half);
    const erH = erase && hover?.day === day && hover?.lid === lid && hover?.half === half;
    const prH = !erase && active !== null && hover?.day === day && hover?.lid === lid && hover?.half === half;
    const col = sub?.color;
    const cr  = active !== null || erase ? "pointer" : "default";
    const lbl = parts ? parts[half === "a" ? 0 : 1] : null;
    return (
      <div
        key={half}
        onClick={() => paint(day, lid, half)}
        onMouseEnter={() => setHover({ day, lid, half })}
        onMouseLeave={() => setHover(null)}
        style={{
          flex: 1,
          background: erH
            ? "rgba(231,76,60,0.18)"
            : col ? col + (prH ? "40" : "1a")
            : prH ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          border: prH && !erH ? `1px solid ${acCol}55` : "1px solid transparent",
          borderLeft: `3px solid ${erH ? "#E74C3C" : col ? col + (prH ? "" : "cc") : prH ? acCol : "rgba(255,255,255,0.08)"}`,
          borderRadius: "6px", padding: "4px 2px", minHeight: "58px", cursor: cr,
          transition: "all 0.1s", display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center", textAlign: "center",
          opacity: erH ? 0.45 : 1, overflow: "hidden",
        }}
      >
        {lbl && (
          <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.38)", fontWeight: "800", letterSpacing: "0.02em", lineHeight: 1, marginBottom: "3px" }}>
            {lbl}
          </span>
        )}
        {erH
          ? <span style={{ fontSize: "0.85rem" }}>🗑</span>
          : sub
            ? <>
                <div style={{ fontSize: "0.95rem", lineHeight: 1 }}>{sub.emoji}</div>
                <div style={{ fontSize: "0.56rem", fontWeight: "700", marginTop: "3px", lineHeight: 1.2, color: "rgba(255,255,255,0.85)", wordBreak: "break-word", maxWidth: "95%" }}>{sub.name}</div>
              </>
            : <span style={{ color: "rgba(255,255,255,0.13)", fontSize: "0.95rem" }}>+</span>
        }
      </div>
    );
  };

  /* ── Render enkelt celle ── */
  const renderSingle = (day, lid) => {
    const sub = disp(day, lid);
    const erH = erase && hover?.day === day && hover?.lid === lid;
    const prH = !erase && active !== null && hover?.day === day && hover?.lid === lid;
    const col = sub?.color;
    const cr  = active !== null || erase ? "pointer" : "default";
    const showSplit = !erase && hover?.day === day && hover?.lid === lid;
    return (
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setHover({ day, lid, half: null })}
        onMouseLeave={() => setHover(null)}
      >
        <div
          onClick={() => paint(day, lid)}
          style={{
            background: erH
              ? "rgba(231,76,60,0.18)"
              : col ? col + (prH ? "40" : "1a")
              : prH ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
            border: prH && !erH ? `1px solid ${acCol}55` : "1px solid transparent",
            borderLeft: `3px solid ${erH ? "#E74C3C" : col ? col + (prH ? "" : "cc") : prH ? acCol : "rgba(255,255,255,0.08)"}`,
            borderRadius: "8px", padding: "7px 3px", minHeight: "58px", cursor: cr,
            transition: "all 0.1s", display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center", textAlign: "center",
            opacity: erH ? 0.45 : 1,
          }}
        >
          {erH
            ? <span style={{ fontSize: "0.85rem" }}>🗑</span>
            : sub
              ? <>
                  <div style={{ fontSize: "1.05rem", lineHeight: 1 }}>{sub.emoji}</div>
                  <div style={{ fontSize: "0.62rem", fontWeight: "700", marginTop: "4px", lineHeight: 1.25, color: "rgba(255,255,255,0.9)", wordBreak: "break-word", maxWidth: "90%" }}>{sub.name}</div>
                </>
              : <div style={{ color: "rgba(255,255,255,0.12)", fontSize: "1.1rem" }}>+</div>
          }
        </div>
        {showSplit && isMg && (
          <button
            onClick={e => { e.stopPropagation(); splitCell(day, lid); }}
            title={parts ? `Del for ${parts[0]} og ${parts[1]}` : "Del cellen i to"}
            style={{
              position: "absolute", top: "4px", right: "4px",
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.85)",
              borderRadius: "5px", fontSize: "0.72rem", padding: "2px 5px",
              cursor: "pointer", zIndex: 5, lineHeight: 1.4,
              display: "flex", alignItems: "center", gap: "3px", fontWeight: "600",
            }}
          >
            ◫
          </button>
        )}
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
    const { schedule, breaks } = buildClassDataFromEditorState(subj, sched, frame);
    const subjectUpdates = {};
    subj.forEach(s => { subjectUpdates[s.name] = { color: s.color, emoji: s.emoji }; });
    onSave(schedule, breaks, subjectUpdates, cn, isMg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", padding: "14px", fontFamily: "system-ui,sans-serif", boxSizing: "border-box", background: "linear-gradient(160deg,#1a2535,#0f1820)", color: "white" }}>

      {/* HEADER – rad 1: klassenavn + knapper */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Tilbake-knapp */}
          <button
            onClick={onBack}
            title="Tilbake til klasselista"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
          >
            ← Tilbake
          </button>
          <span style={{ fontSize: "1.3rem" }}>🏫</span>
          {editCn
            ? <input
                autoFocus value={cn} onChange={e => setCn(e.target.value)}
                onBlur={() => setEditCn(false)}
                onKeyDown={e => e.key === "Enter" && setEditCn(false)}
                style={inp({ width: "170px", fontSize: "1rem", fontWeight: "700", padding: "3px 8px" })}
              />
            : <span
                onClick={() => setEditCn(true)}
                style={{ fontSize: "1rem", fontWeight: "700", cursor: "text", borderBottom: "2px dashed rgba(255,255,255,0.25)", paddingBottom: "1px" }}
                title="Klikk for å endre"
              >
                {cn} <span style={{ fontSize: "0.65rem", opacity: 0.35 }}>✎</span>
              </span>
          }
          {isMg && parts && (
            <span style={{ fontSize: "0.62rem", background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.3)", color: "#40C4FF", borderRadius: "20px", padding: "2px 8px", fontWeight: "600" }}>
              Fådelt · {parts[0]} / {parts[1]}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            onClick={() => { setFEdit(JSON.parse(JSON.stringify(frame))); setModal("frame"); }}
            style={{ background: "rgba(64,196,255,0.1)", border: "1px solid rgba(64,196,255,0.4)", color: "#40C4FF", padding: "6px 11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.74rem", fontWeight: "600" }}
          >
            Rediger timeplan
          </button>
          <button
            onClick={() => { setErase(e => !e); setActive(null); }}
            style={{ background: erase ? "rgba(231,76,60,0.2)" : "rgba(64,196,255,0.1)", border: `1px solid ${erase ? "#E74C3C99" : "rgba(64,196,255,0.4)"}`, color: erase ? "#E74C3C" : "#40C4FF", padding: "6px 11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.74rem", fontWeight: "600" }}
          >
            🗑 {erase ? "Slette-modus på" : "Slette-modus"}
          </button>
          <button
            onClick={handleSave}
            style={{ background: saved ? "#27AE6022" : "rgba(64,196,255,0.1)", border: `1px solid ${saved ? "#27AE60" : "rgba(64,196,255,0.4)"}`, color: saved ? "#27AE60" : "#40C4FF", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.74rem", fontWeight: "700", transition: "all 0.2s" }}
          >
            {saved ? "✓ Lagret!" : "Lagre"}
          </button>
        </div>
      </div>

      {/* HEADER – rad 2: ny klasse */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginBottom: "12px" }}>
        <button
          onClick={() => { setNewCn(""); setModal("newClass"); }}
          style={{ background: "rgba(67,160,71,0.12)", border: "1px solid rgba(67,160,71,0.45)", color: "#66BB6A", padding: "4px 11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.7rem", fontWeight: "600" }}
        >
          + Ny klasse
        </button>
        <button
          onClick={() => { setNewCn(""); setModal("newMgClass"); }}
          style={{ background: "rgba(142,36,170,0.14)", border: "1px solid rgba(142,36,170,0.5)", color: "#CE93D8", padding: "4px 11px", borderRadius: "8px", cursor: "pointer", fontSize: "0.7rem", fontWeight: "600" }}
        >
          + Ny fådelt klasse
        </button>
      </div>

      {/* GRID */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "3px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "76px" }} />
            {DAYS.map(d => <col key={d} />)}
          </colgroup>
          <thead>
            <tr>
              <th />
              {DAYS.map((d, i) => (
                <th key={d} style={{ padding: "5px 2px", textAlign: "center", color: "rgba(255,255,255,0.45)", fontWeight: "700", fontSize: "0.75rem", letterSpacing: "0.04em" }}>{DAYS_S[i]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frame.map(row => row.type === "break"
              ? <tr key={row.id}>
                  <td style={{ textAlign: "right", padding: "1px 6px 1px 0", verticalAlign: "middle" }}>
                    <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.57rem" }}>{row.start}–{row.end}</span>
                  </td>
                  <td colSpan={5} style={{ padding: "1px" }}>
                    <div style={{ background: "rgba(255,255,255,0.035)", borderRadius: "5px", padding: "3px 10px", color: "rgba(255,255,255,0.22)", fontSize: "0.62rem", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.07em" }}>{row.label}</div>
                  </td>
                </tr>
              : <tr key={row.id}>
                  <td style={{ padding: "2px 6px 2px 0", textAlign: "right", verticalAlign: "middle" }}>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem", fontWeight: "700" }}>{row.label}</div>
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.57rem" }}>{row.start}–{row.end}</div>
                  </td>
                  {DAYS.map(day => {
                    const raw   = sched[day]?.[row.id];
                    const split = isSplit(raw);
                    return (
                      <td key={day} style={{ padding: "2px" }}>
                        {split
                          ? <div style={{ position: "relative" }}>
                              <button
                                onClick={() => mergeCell(day, row.id)}
                                title="Slå sammen"
                                style={{ position: "absolute", top: "3px", right: "3px", zIndex: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.7)", borderRadius: "4px", fontSize: "0.6rem", padding: "1px 5px", cursor: "pointer", lineHeight: 1.5, fontWeight: "700" }}>⊟</button>
                              <div style={{ display: "flex", flexDirection: "row", gap: "2px" }}>
                                {renderHalf(day, row.id, "a")}
                                {renderHalf(day, row.id, "b")}
                              </div>
                            </div>
                          : renderSingle(day, row.id)
                        }
                      </td>
                    );
                  })}
                </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "16px 0 14px" }} />

      {/* FAG-PALETT */}
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase" }}>Fag</span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.68rem" }}>
            {active ? `← Klikk celle for «${acSub?.name}»` : erase ? "← Klikk celle for å slette" : "Velg et fag, klikk deretter en celle"}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {subj.map(s => (
            <div key={s.id} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <button
                onClick={() => { setActive(p => p === s.id ? null : s.id); setErase(false); }}
                style={{ background: active === s.id ? s.color : s.color + "22", border: `1.5px solid ${s.color}`, borderRadius: "20px", padding: "5px 26px 5px 10px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "0.73rem", fontWeight: "600", transition: "all 0.12s", transform: active === s.id ? "scale(1.06)" : "scale(1)", boxShadow: active === s.id ? `0 0 14px ${s.color}55` : "none" }}
              >
                <span style={{ fontSize: "0.85rem" }}>{s.emoji}</span>
                <span>{s.name}</span>
              </button>
              <button
                onClick={() => setEditSj(s.id)}
                title="Rediger fag"
                style={{ position: "absolute", right: "8px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.62rem", padding: 0, lineHeight: 1 }}
              >✎</button>
            </div>
          ))}
          <button
            onClick={() => setModal("newSubj")}
            style={{ background: "transparent", border: "1.5px dashed rgba(255,255,255,0.18)", borderRadius: "20px", padding: "5px 12px", color: "rgba(255,255,255,0.32)", cursor: "pointer", fontSize: "0.73rem", fontWeight: "600" }}
          >
            + Nytt fag
          </button>
        </div>
        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.22)", fontSize: "0.64rem" }}>
          💡 Fagfarger og emojier synkroniseres automatisk med statuslinjen på hovedskjermen
        </p>
      </div>

      {/* REDIGER FAG */}
      {editSj !== null && (() => {
        const s = subj.find(x => x.id === editSj);
        if (!s) return null;
        const upd = (k, v) => setSubj(p => p.map(x => x.id === editSj ? { ...x, [k]: v } : x));
        return (
          <Overlay onClose={() => setEditSj(null)}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.95rem" }}>Rediger: {s.name}</h3>
            <input value={s.name} onChange={e => upd("name", e.target.value)} style={inp({ width: "100%", marginBottom: "10px" })} placeholder="Fagnavn" />
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center" }}>
              <input value={s.emoji} onChange={e => upd("emoji", e.target.value)} style={inp({ width: "58px", textAlign: "center", fontSize: "1.3rem", padding: "5px" })} placeholder="😀" />
              <input type="color" value={s.color} onChange={e => upd("color", e.target.value)} style={{ width: "44px", height: "40px", border: "none", borderRadius: "8px", cursor: "pointer", flexShrink: 0 }} />
              <div style={inp({ flex: 1, padding: "6px 10px", fontFamily: "monospace", fontSize: "0.8rem", pointerEvents: "none" })}>{s.color}</div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setEditSj(null)} style={{ flex: 1, background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.5)", color: "#40C4FF", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Ferdig</button>
              <button onClick={() => { setSubj(p => p.filter(x => x.id !== editSj)); setEditSj(null); }} style={{ background: "rgba(231,76,60,0.15)", border: "1px solid #E74C3C55", color: "#E74C3C", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>Slett fag</button>
            </div>
          </Overlay>
        );
      })()}

      {/* NYTT FAG */}
      {modal === "newSubj" && (
        <Overlay onClose={() => setModal(null)}>
          <h3 style={{ margin: "0 0 14px", fontSize: "0.95rem" }}>Nytt fag</h3>
          <input autoFocus placeholder="Fagnavn" value={newSj.name} onChange={e => setNewSj(p => ({ ...p, name: e.target.value }))} style={inp({ width: "100%", marginBottom: "10px" })} />
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center" }}>
            <input placeholder="😀" value={newSj.emoji} onChange={e => setNewSj(p => ({ ...p, emoji: e.target.value }))} style={inp({ width: "58px", textAlign: "center", fontSize: "1.3rem", padding: "5px" })} />
            <input type="color" value={newSj.color} onChange={e => setNewSj(p => ({ ...p, color: e.target.value }))} style={{ width: "44px", height: "40px", border: "none", borderRadius: "8px", cursor: "pointer" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Velg farge</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                if (!newSj.name.trim()) return;
                const id = Math.max(...subj.map(s => s.id), 0) + 1;
                setSubj(p => [...p, { id, ...newSj }]);
                setActive(id);
                setErase(false);
                setModal(null);
                setNewSj({ name: "", emoji: "📚", color: "#4A90E2" });
              }}
              style={{ flex: 1, background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.5)", color: "#40C4FF", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
            >Legg til</button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", padding: "8px", borderRadius: "8px", cursor: "pointer" }}>Avbryt</button>
          </div>
        </Overlay>
      )}

      {/* NY VANLIG KLASSE */}
      {modal === "newClass" && (
        <Overlay onClose={() => setModal(null)}>
          <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Ny klasse</h3>
          <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.35)", fontSize: "0.78rem" }}>Skriv trinnummer eller klassenavn.</p>
          <input autoFocus placeholder="f.eks. 8A" value={newCn} onChange={e => setNewCn(e.target.value)} onKeyDown={e => e.key === "Enter" && doCreateClass(false)} style={inp({ width: "100%", marginBottom: "14px" })} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => doCreateClass(false)} style={{ flex: 1, background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.5)", color: "#40C4FF", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Opprett</button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", padding: "8px", borderRadius: "8px", cursor: "pointer" }}>Avbryt</button>
          </div>
        </Overlay>
      )}

      {/* NY FÅDELT KLASSE */}
      {modal === "newMgClass" && (
        <Overlay onClose={() => setModal(null)}>
          <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Ny fådelt klasse</h3>
          <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.35)", fontSize: "0.78rem" }}>
            Skriv trinnummer eller klassenavn (for eksempel «6. og 7.»).
          </p>
          <input
            autoFocus
            placeholder='f.eks. "6. og 7." eller "5 og 6 trinn"'
            value={newCn}
            onChange={e => setNewCn(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doCreateClass(true)}
            style={inp({ width: "100%", marginBottom: "8px" })}
          />
          <div style={{ marginBottom: "14px", minHeight: "22px" }}>
            {newCn.trim() && (
              previewParts
                ? <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                    <span style={{ color: "#43A047" }}>✓</span>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Gjenkjent:</span>
                    <span style={{ background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.3)", color: "#40C4FF", borderRadius: "12px", padding: "1px 8px", fontWeight: "700" }}>{previewParts[0]}</span>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>og</span>
                    <span style={{ background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.3)", color: "#40C4FF", borderRadius: "12px", padding: "1px 8px", fontWeight: "700" }}>{previewParts[1]}</span>
                  </div>
                : <div style={{ fontSize: "0.72rem", color: "rgba(255,200,100,0.7)" }}>
                    ⚠ Klarer ikke å finne to trinnummer – delceller merkes A / B
                  </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => doCreateClass(true)} style={{ flex: 1, background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.5)", color: "#40C4FF", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Opprett</button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", padding: "8px", borderRadius: "8px", cursor: "pointer" }}>Avbryt</button>
          </div>
        </Overlay>
      )}

      {/* REDIGER TIMEPLAN-RAMMER */}
      {modal === "frame" && fEdit && (
        <Overlay onClose={() => setModal(null)}>
          <h3 style={{ margin: "0 0 4px", fontSize: "0.95rem" }}>Rediger timeplan</h3>
          <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>T = time · P = pause. Endre navn og klokkeslett etter behov.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
            {fEdit.map(row => (
              <div key={row.id} style={{ display: "flex", alignItems: "center", gap: "5px", background: row.type === "lesson" ? "rgba(64,196,255,0.07)" : "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "6px 8px" }}>
                <span style={{ fontSize: "0.62rem", color: row.type === "lesson" ? "#40C4FF88" : "rgba(255,255,255,0.3)", width: "14px", fontWeight: "700", flexShrink: 0 }}>{row.type === "lesson" ? "T" : "P"}</span>
                <input value={row.label} onChange={e => fUpd(row.id, "label", e.target.value)} style={inp({ flex: 2, padding: "4px 7px", fontSize: "0.78rem" })} />
                <input value={row.start} onChange={e => fUpd(row.id, "start", e.target.value)} style={inp({ width: "52px", padding: "4px 5px", textAlign: "center", fontSize: "0.78rem", fontFamily: "monospace" })} placeholder="08:30" />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", flexShrink: 0 }}>–</span>
                <input value={row.end} onChange={e => fUpd(row.id, "end", e.target.value)} style={inp({ width: "52px", padding: "4px 5px", textAlign: "center", fontSize: "0.78rem", fontFamily: "monospace" })} placeholder="09:30" />
                <button onClick={() => fRem(row.id)} style={{ background: "rgba(231,76,60,0.12)", border: "none", color: "#E74C3C88", borderRadius: "5px", padding: "3px 7px", cursor: "pointer", fontSize: "0.75rem", flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
            <button onClick={() => fAdd("lesson")} style={{ flex: 1, background: "rgba(64,196,255,0.07)", border: "1px dashed rgba(64,196,255,0.3)", color: "#40C4FF88", padding: "6px", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem" }}>+ Time</button>
            <button onClick={() => fAdd("break")} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.35)", padding: "6px", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem" }}>+ Pause</button>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={fSave} style={{ flex: 1, background: "rgba(64,196,255,0.12)", border: "1px solid rgba(64,196,255,0.5)", color: "#40C4FF", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Lagre</button>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", padding: "8px", borderRadius: "8px", cursor: "pointer" }}>Avbryt</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
