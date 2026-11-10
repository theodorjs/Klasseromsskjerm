import { useState, useCallback } from 'react';
import {
  cloneDefaultClass,
  DEFAULT_CLASS_NAME,
  SCHOOL_MAIN_TIMES,
  LOWER_GRADE_STANDARD_COLORS,
  SCHOOL_DAY_FRAMES
} from '../data/constants.js';
import {
  ensureClassData,
  normalizeActiveTimelineClassNames,
  extractGradesFromName,
  getDefaultMultiGradeLabels,
  buildScheduleEditorDraftFromClass,
  createEmptyScheduleEditorDraft,
  buildStoredActivityFromEditorFields,
  canonicalizeSubjectName,
  normalizeSubjectLabel,
  normalizeStoredTimeValue,
  sortEntriesByStart,
  generateMutedPaletteColors,
  normalizeScheduleEditorDraftForCompare,
  getActivitySubjectParts,
} from '../utils/schedule.js';
import { buildClassFromSharePayload } from '../utils/share.js';

import { safeGetItem, safeSetItem, safeRemoveItem, stashRescuedData } from '../utils/storage.js';
import { lesTema } from '../utils/tema.js';
import { aktivSkole } from '../data/skoletema.js';
import { skoleKlasser } from '../data/skoler/index.js';

/** Ved import av en delt timeplan huskes forrige versjon her, så «Angre» virker også senere. */
const LAST_IMPORT_KEY = 'klasseromData.sisteImport';

function loadLastImport() {
  try {
    const raw = safeGetItem(LAST_IMPORT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function loadClasses() {
  let classes = {};
  let savedData = null;
  try {
    savedData = safeGetItem('klasseromData');
    if (savedData) classes = JSON.parse(savedData);
  } catch (e) {
    console.error("Error parsing klasseromData", e);
    // Aldri overskriv skadede data stille: ta vare på råteksten så den kan reddes.
    stashRescuedData(savedData);
    classes = {};
  }

  // Klasser som ikke er objekter med en timeplan ville krasjet resten av
  // oppstarten. Sett dem i karantene i stedet for å ta ned hele skjermen.
  if (classes && typeof classes === 'object' && !Array.isArray(classes)) {
    const brokenNames = Object.keys(classes).filter(name => {
      const cd = classes[name];
      return !cd || typeof cd !== 'object' || Array.isArray(cd)
        || (cd.schedule !== undefined && (typeof cd.schedule !== 'object' || cd.schedule === null));
    });
    if (brokenNames.length) {
      console.warn('Hopper over skadede klasser:', brokenNames);
      stashRescuedData(savedData);
      brokenNames.forEach(name => { delete classes[name]; });
    }
  }

  if (!classes || typeof classes !== 'object' || Array.isArray(classes) || Object.keys(classes).length === 0) {
    // På en skoles egen nettside ligger skolens klasser klare (se src/data/skoler)
    const skole = aktivSkole();
    const fraSkolen = skole ? skoleKlasser(skole.id) : null;
    if (fraSkolen) {
      classes = fraSkolen;
      safeSetItem('currentClassName', Object.keys(fraSkolen)[0]);
    } else {
      classes = { [DEFAULT_CLASS_NAME]: cloneDefaultClass() };
      classes[DEFAULT_CLASS_NAME].name = DEFAULT_CLASS_NAME;
      safeSetItem('currentClassName', DEFAULT_CLASS_NAME);
    }
    safeSetItem('klasseromData', JSON.stringify(classes));
  }

  // Migration: 9A -> 7. og 8.
  const classNamesAfterLoad = Object.keys(classes);
  if (classNamesAfterLoad.length === 1 && classNamesAfterLoad[0] === "9A") {
    classes["7. og 8."] = classes["9A"];
    classes["7. og 8."].name = "7. og 8.";
    delete classes["9A"];
    safeSetItem('klasseromData', JSON.stringify(classes));
    const storedCurrentClassName = safeGetItem('currentClassName');
    if (!storedCurrentClassName || storedCurrentClassName === "9A") {
      safeSetItem('currentClassName', "7. og 8.");
    }
    try {
      const savedActive = JSON.parse(safeGetItem('activeTimelineClassNames') || '[]');
      if (Array.isArray(savedActive)) {
        const migrated = savedActive.map(name => name === "9A" ? "7. og 8." : name);
        safeSetItem('activeTimelineClassNames', JSON.stringify(migrated));
      }
    } catch {
      // ignorer ugyldig liste
    }
  }

  // Migration: legacy 7. og 8. template
  const cd78 = classes["7. og 8."];
  if (cd78 && cd78.schedule) {
    const monday = cd78.schedule["Mandag"] || [];
    const tuesday = cd78.schedule["Tirsdag"] || [];
    const friday = cd78.schedule["Fredag"] || [];
    const looksLikeLegacyTemplate =
      monday[0]?.activity === "Norsk" &&
      monday[0]?.end === "09:15" &&
      tuesday[0]?.activity === "Naturfag" &&
      friday[friday.length - 1]?.activity === "Klasstime";
    if (looksLikeLegacyTemplate) {
      const upgraded = cloneDefaultClass();
      cd78.schedule = JSON.parse(JSON.stringify(upgraded.schedule));
      cd78.breaks = JSON.parse(JSON.stringify(upgraded.breaks));
      cd78.mainTimes = JSON.parse(JSON.stringify(upgraded.mainTimes));
      cd78.name = "7. og 8.";
      safeSetItem('klasseromData', JSON.stringify(classes));
    }
  }

  // ── Reparasjon: fadelte okter lagret uten trinn-suffiks ──────────────
  // En tidligere versjon av timeplaneditoren lagret delte okter som
  // "Kroppsoving / Matematikk" uten a si hvilket trinn som har hva.
  // Hovedskjermen trenger suffikset ("Kroppsoving 8. / Matematikk 9."),
  // og viste ellers hele strengen pa begge linjer.
  // Samtidig kunne trinn-etikettene henge igjen fra et gammelt klassenavn.
  (function repairMultiGradeSchedules() {
    const hasGradeSuffix = (part) => /\s\d+\.?$/.test(String(part || '').trim());
    let didRepair = false;

    Object.entries(classes).forEach(([className, cd]) => {
      if (!cd || !cd.schedule) return;

      const grades = extractGradesFromName(cd.name || className);
      if (grades.length !== 2) return;          // kun fadelte klasser
      const labels = getDefaultMultiGradeLabels(cd.name || className);

      // 1) Trinn-etiketter som henger igjen fra et gammelt klassenavn
      const current = Array.isArray(cd.multiGradeLabels) ? cd.multiGradeLabels : [];
      if (current[0] !== labels[0] || current[1] !== labels[1]) {
        cd.multiGradeLabels = labels;
        cd.multiGradeMode = true;
        didRepair = true;
      }

      // 2) Delte okter uten trinn-suffiks
      Object.keys(cd.schedule).forEach(day => {
        (cd.schedule[day] || []).forEach(entry => {
          if (!entry || entry.parallel) return;              // parallelle fag skal IKKE ha suffiks
          const act = String(entry.activity || '');
          if (!act.includes('/')) return;
          const parts = act.split('/').map(x => x.trim()).filter(Boolean);
          if (parts.length !== 2) return;
          if (parts.some(hasGradeSuffix)) return;            // allerede riktig
          entry.activity = `${parts[0]} ${labels[0]} / ${parts[1]} ${labels[1]}`;
          didRepair = true;
        });
      });
    });

    if (didRepair) {
      safeSetItem('klasseromData', JSON.stringify(classes));
    }
  })();

  Object.values(classes).forEach(ensureClassData);

  // Apply lower grade standard colors (one-time migration)
  const migrationKey = 'lowerGradeStandardColorsApplied_v1';
  if (safeGetItem(migrationKey) !== 'true') {
    let didChange = false;
    ["5. trinn", "6. trinn"].forEach((className) => {
      const cd = classes[className];
      if (!cd) return;
      ensureClassData(cd);
      cd.subjectColors = { ...cd.subjectColors, ...LOWER_GRADE_STANDARD_COLORS };
      didChange = true;
    });
    if (didChange) safeSetItem('klasseromData', JSON.stringify(classes));
    safeSetItem(migrationKey, 'true');
  }

  return classes;
}

function loadTempScheduleChanges() {
  let temp = { date: "", changes: {} };
  try {
    const saved = safeGetItem('tempScheduleChanges', sessionStorage);
    if (saved) temp = JSON.parse(saved);
  } catch {
    // start med tom liste
  }
  const todayDate = new Date().toISOString().split('T')[0];
  if (temp.date !== todayDate) {
    temp = { date: todayDate, changes: {} };
    safeSetItem('tempScheduleChanges', JSON.stringify(temp), sessionStorage);
  }
  if (!temp.changes) temp.changes = {};
  return temp;
}

function getUniqueSubjectsFromClass(classData) {
  const subjects = new Set();
  ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"].forEach(day => {
    const combined = [
      ...(classData.schedule?.[day] || []),
      ...(classData.breaks?.[day] || [])
    ];
    combined.forEach(entry => {
      const activity = entry.activity;
      if (!activity) return;
      if (["Pause", "Mat", "Storefri"].includes(activity)) {
        subjects.add(activity);
        return;
      }
      getActivitySubjectParts(activity).forEach(segment => {
        const normalized = canonicalizeSubjectName(segment.subject);
        if (normalized) subjects.add(normalized);
      });
    });
  });
  return Array.from(subjects).sort();
}

export function useAppState() {
  const [classes, setClassesState] = useState(() => loadClasses());

  const [currentClassName, setCurrentClassNameState] = useState(() => {
    const c = loadClasses();
    let name = safeGetItem('currentClassName') || Object.keys(c)[0];
    if (!c[name]) name = Object.keys(c)[0];
    return name;
  });

  const [activeTimelineClassNames, setActiveTimelineClassNamesState] = useState(() => {
    const c = loadClasses();
    let name = safeGetItem('currentClassName') || Object.keys(c)[0];
    if (!c[name]) name = Object.keys(c)[0];
    let list = [];
    try {
      const saved = JSON.parse(safeGetItem('activeTimelineClassNames') || '[]');
      if (Array.isArray(saved)) list = saved;
    } catch {
      // start med gjeldende klasse
    }
    return normalizeActiveTimelineClassNames(list, c, name);
  });

  const [tempScheduleChanges, setTempScheduleChangesState] = useState(() => loadTempScheduleChanges());
  const [editPermission, setEditPermissionState] = useState(() => safeGetItem('isTeacher', sessionStorage) === 'true');

  // Simulated time: null values mean real time
  const [simState, setSimState] = useState({ simDay: null, simHour: null, simMinute: null });

  // Theme
  const [themeMode, setThemeModeState] = useState(lesTema);

  // UI panel visibility
  const [timerPanelOpen, setTimerPanelOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [underTheHoodOpen, setUnderTheHoodOpen] = useState(false);
  const [underTheHoodView, setUnderTheHoodView] = useState('classGrid');
  const [scheduleEditorDraft, setScheduleEditorDraft] = useState(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [toolboxOpen, setToolboxOpen] = useState(false);

  // Modal states
  const [editModal, setEditModal] = useState(null);
  const [activityModal, setActivityModal] = useState(null);
  const [countdownModal, setCountdownModal] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [colorDetailModal, setColorDetailModal] = useState(null);

  // Agenda subject selection
  const [agendaSubject, setAgendaSubject] = useState('');

  // Siste mottatte deling – gjør «Angre» mulig, også etter at dialogen er lukket
  const [lastImportBackup, setLastImportBackup] = useState(() => loadLastImport());

  // Internal helper to save classes to state + localStorage
  const saveClasses = useCallback((newClasses) => {
    const copy = { ...newClasses };
    Object.values(copy).forEach(ensureClassData);
    safeSetItem('klasseromData', JSON.stringify(copy));
    setClassesState(copy);
    return copy;
  }, []);

  const updateTempSchedule = useCallback((updater) => {
    setTempScheduleChangesState(prev => {
      const next = updater(prev);
      safeSetItem('tempScheduleChanges', JSON.stringify(next), sessionStorage);
      return next;
    });
  }, []);

  // Actions
  const selectClass = useCallback((name) => {
    setCurrentClassNameState(name);
    safeSetItem('currentClassName', name);

    setClassesState(prev => {
      const cd = prev[name];
      if (cd) ensureClassData(cd);
      return prev;
    });

    setActiveTimelineClassNamesState(prev => {
      let next = [...prev];
      if (!next.includes(name)) {
        if (next.length >= 2) {
          const secondary = next.find(n => n !== name);
          next = secondary ? [name, secondary] : [name];
        } else {
          next.unshift(name);
        }
      } else {
        next = [name, ...next.filter(n => n !== name)];
      }
      setClassesState(cls => {
        const normalized = normalizeActiveTimelineClassNames(next, cls, name);
        safeSetItem('activeTimelineClassNames', JSON.stringify(normalized));
        return cls;
      });
      return next;
    });
  }, []);

  const toggleTimelineClass = useCallback((name) => {
    setActiveTimelineClassNamesState(prev => {
      const isActive = prev.includes(name);
      let next;
      if (isActive) {
        if (prev.length === 1) return prev;
        next = prev.filter(n => n !== name);
        setCurrentClassNameState(curName => {
          if (curName === name) {
            const newCur = next[0];
            safeSetItem('currentClassName', newCur);
            return newCur;
          }
          return curName;
        });
      } else if (prev.length < 2) {
        next = [...prev, name];
      } else {
        setCurrentClassNameState(curName => {
          const keepName = curName && prev.includes(curName) ? curName : prev[0];
          next = [keepName, name];
          return curName;
        });
        next = next || [prev[0], name];
      }
      setClassesState(cls => {
        const normalized = normalizeActiveTimelineClassNames(next, cls, name);
        safeSetItem('activeTimelineClassNames', JSON.stringify(normalized));
        return cls;
      });
      return next;
    });
  }, []);

  const renameCurrentClass = useCallback((oldName, newName) => {
    setClassesState(prev => {
      if (!newName || newName === oldName || prev[newName]) return prev;
      const newClasses = { ...prev };
      newClasses[newName] = newClasses[oldName];
      newClasses[newName].name = newName;
      delete newClasses[oldName];

      // Trinn-etikettene folger klassenavnet, ellers viser hovedskjermen
      // fortsatt gamle trinn (f.eks. "7." / "8." etter bytte til "8. og 9.").
      const renamedGrades = extractGradesFromName(newName);
      if (renamedGrades.length === 2) {
        newClasses[newName].multiGradeLabels = getDefaultMultiGradeLabels(newName);
        newClasses[newName].multiGradeMode = true;
      } else if (renamedGrades.length <= 1) {
        newClasses[newName].multiGradeLabels = getDefaultMultiGradeLabels(newName);
      }

      const oldShiftKey = `paletteShiftIndex:${oldName}`;
      const newShiftKey = `paletteShiftIndex:${newName}`;
      const shiftValue = safeGetItem(oldShiftKey);
      if (shiftValue !== null) {
        safeSetItem(newShiftKey, shiftValue);
        localStorage.removeItem(oldShiftKey);
      }

      safeSetItem('currentClassName', newName);
      setCurrentClassNameState(newName);

      setActiveTimelineClassNamesState(tl => {
        const newTl = tl.map(n => n === oldName ? newName : n);
        const normalized = normalizeActiveTimelineClassNames(newTl, newClasses, newName);
        safeSetItem('activeTimelineClassNames', JSON.stringify(normalized));
        return normalized;
      });

      Object.values(newClasses).forEach(ensureClassData);
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, []);

  const deleteCurrentClass = useCallback((name) => {
    setClassesState(prev => {
      const names = Object.keys(prev);
      if (names.length <= 1) return prev;
      const newClasses = { ...prev };
      delete newClasses[name];
      localStorage.removeItem(`paletteShiftIndex:${name}`);
      const nextName = Object.keys(newClasses)[0];
      safeSetItem('currentClassName', nextName);
      setCurrentClassNameState(nextName);
      ensureClassData(newClasses[nextName]);

      setActiveTimelineClassNamesState(tl => {
        const newTl = tl.filter(n => n !== name);
        const normalized = normalizeActiveTimelineClassNames(newTl, newClasses, nextName);
        safeSetItem('activeTimelineClassNames', JSON.stringify(normalized));
        return normalized;
      });

      Object.values(newClasses).forEach(ensureClassData);
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, []);

  const addNewClass = useCallback((name) => {
    setClassesState(prev => {
      if (!name || prev[name]) return prev;
      const newClasses = { ...prev };
      newClasses[name] = cloneDefaultClass();
      newClasses[name].name = name;
      newClasses[name].multiGradeMode = extractGradesFromName(name).length === 2;
      newClasses[name].multiGradeLabels = getDefaultMultiGradeLabels(name);
      ensureClassData(newClasses[name]);
      Object.values(newClasses).forEach(ensureClassData);
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
    // selectClass will be called from the component after this
  }, []);

  const setThemeMode = useCallback((mode) => {
    const m = String(mode);
    setThemeModeState(m);
    safeSetItem('preferredMode', m);
  }, []);

  const grantEditPermission = useCallback(() => {
    setEditPermissionState(true);
    safeSetItem('isTeacher', 'true', sessionStorage);
  }, []);

  const revokeEditPermission = useCallback(() => {
    setEditPermissionState(false);
    safeSetItem('isTeacher', 'false', sessionStorage);
  }, []);

  const resetToRealTime = useCallback(() => {
    setSimState({ simDay: null, simHour: null, simMinute: null });
  }, []);

  const applySimTime = useCallback((day, hour, minute) => {
    setSimState({ simDay: day, simHour: hour, simMinute: minute });
  }, []);

  // Countdown actions
  const saveCountdown = useCallback((payload, editingIndex) => {
    setClassesState(prev => {
      if (!prev[currentClassName]) return prev;
      // Kopier før endring: React kan kjøre denne funksjonen to ganger (StrictMode),
      // og da ville en push rett i forrige tilstand lagt til nedtellingen dobbelt.
      const cd = { ...prev[currentClassName] };
      const newClasses = { ...prev, [currentClassName]: cd };
      ensureClassData(cd);
      const list = Array.isArray(cd.customCountdowns) ? [...cd.customCountdowns] : [];
      if (editingIndex !== null && list[editingIndex]) {
        list[editingIndex] = payload;
      } else if (list.length < 3) {
        list.push(payload);
      }
      cd.customCountdowns = list;
      cd.countdownsVisible = true;
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const deleteCountdown = useCallback((index) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd || !Array.isArray(cd.customCountdowns)) return prev;
      cd.customCountdowns.splice(index, 1);
      if (!cd.customCountdowns.length) cd.countdownsVisible = true;
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const toggleCountdownVisibility = useCallback(() => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      cd.countdownsVisible = cd.countdownsVisible === false;
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  // Agenda actions
  const saveAgendaItem = useCallback((subject, payload, editingIndex) => {
    setClassesState(prev => {
      if (!prev[currentClassName]) return prev;
      // Kopier før endring (se saveCountdown): ellers dobbelt gjøremål i StrictMode
      const cd = { ...prev[currentClassName] };
      const newClasses = { ...prev, [currentClassName]: cd };
      const list = [...((cd.agendas || {})[subject] || [])];
      if (editingIndex !== null && list[editingIndex] !== undefined) {
        const existing = list[editingIndex];
        list[editingIndex] = { ...existing, ...payload, completed: existing.completed };
      } else {
        list.push(payload);
      }
      cd.agendas = { ...(cd.agendas || {}), [subject]: list };
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const toggleAgendaItemCompleted = useCallback((subject, index) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (cd?.agendas?.[subject]?.[index] === undefined) return prev;
      cd.agendas[subject][index].completed = !cd.agendas[subject][index].completed;
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const deleteAgendaItem = useCallback((subject, index) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd?.agendas?.[subject]) return prev;
      cd.agendas[subject] = cd.agendas[subject].filter((_, i) => i !== index);
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const reorderAgendaItems = useCallback((subject, newItems) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      if (!cd.agendas) cd.agendas = {};
      cd.agendas[subject] = newItems;
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const clearAgenda = useCallback((subject) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      if (!cd.agendas) cd.agendas = {};
      cd.agendas[subject] = [];
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const saveAgendaTemplate = useCallback((subject) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd?.agendas?.[subject]?.length) return prev;
      if (!cd.templates) cd.templates = {};
      cd.templates[subject] = JSON.parse(JSON.stringify(cd.agendas[subject]));
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const loadAgendaTemplate = useCallback((subject) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd?.templates?.[subject]) return prev;
      if (!cd.agendas) cd.agendas = {};
      cd.agendas[subject] = JSON.parse(JSON.stringify(cd.templates[subject]));
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  // Subject color actions
  const saveSubjectColor = useCallback((subject, color, emoji) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      if (!cd.subjectColors) cd.subjectColors = {};
      if (!cd.subjectEmojis) cd.subjectEmojis = {};
      cd.subjectColors[subject] = color;
      if (emoji !== undefined) cd.subjectEmojis[subject] = emoji;
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const generatePalette = useCallback(() => {
    setClassesState(prev => {
      const cd = prev[currentClassName];
      if (!cd) return prev;
      const subjects = getUniqueSubjectsFromClass(cd);
      if (!subjects.length) return prev;

      const shiftKey = `paletteShiftIndex:${currentClassName}`;
      const paletteSize = Math.max(1, subjects.length);
      const rawShift = parseInt(safeGetItem(shiftKey) || '0', 10);
      const currentShift = Number.isFinite(rawShift) ? ((rawShift % paletteSize) + paletteSize) % paletteSize : 0;
      const step = 360 / paletteSize;
      const startH = currentShift * step;
      const palette = generateMutedPaletteColors(subjects.length, { startH, endH: startH + 360 });

      const newClasses = { ...prev };
      const newCd = newClasses[currentClassName];
      if (!newCd.subjectColors) newCd.subjectColors = {};
      subjects.forEach((subj, idx) => { newCd.subjectColors[subj] = palette[idx]; });
      safeSetItem(shiftKey, String((currentShift + 1) % paletteSize));
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  /**
   * Tar imot en delt timeplan (fra #del=-lenke). Erstatter timeplan, pauser,
   * farger og emoji for klassen med samme navn – eller oppretter den – og
   * beholder lokal agenda og nedtellinger. Returnerer { replaced }.
   * Forrige versjon av akkurat denne klassen lagres, så «Angre» kan gjøres senere.
   */
  const importSharedClass = useCallback((payload) => {
    const existing = Object.hasOwn(classes, payload.name) ? classes[payload.name] : null;
    const built = buildClassFromSharePayload(payload, existing);
    const newClasses = { ...classes, [payload.name]: built };
    Object.values(newClasses).forEach(ensureClassData);

    const backup = {
      name: payload.name,
      previous: existing ? JSON.parse(JSON.stringify(existing)) : null,
      previousCurrentClassName: currentClassName,
      previousActive: [...activeTimelineClassNames],
      at: new Date().toISOString(),
    };
    setLastImportBackup(backup);
    safeSetItem(LAST_IMPORT_KEY, JSON.stringify(backup));

    safeSetItem('klasseromData', JSON.stringify(newClasses));
    setClassesState(newClasses);
    selectClass(payload.name);
    return { replaced: !!existing };
  }, [classes, currentClassName, activeTimelineClassNames, selectClass]);

  /** Angrer bare den importerte klassen; alt annet som er gjort siden beholdes. */
  const undoLastImport = useCallback(() => {
    if (!lastImportBackup) return;
    const { name, previous, previousCurrentClassName, previousActive } = lastImportBackup;
    let restoredClasses = null;
    setClassesState(prev => {
      const next = { ...prev };
      if (previous) next[name] = JSON.parse(JSON.stringify(previous));
      else delete next[name];
      if (!Object.keys(next).length) next[DEFAULT_CLASS_NAME] = cloneDefaultClass();
      Object.values(next).forEach(ensureClassData);
      safeSetItem('klasseromData', JSON.stringify(next));
      restoredClasses = next;

      const fallbackName = Object.hasOwn(next, previousCurrentClassName) ? previousCurrentClassName : Object.keys(next)[0];
      setCurrentClassNameState(cur => {
        const nextCur = Object.hasOwn(next, cur) && (previous || cur !== name) ? cur : fallbackName;
        safeSetItem('currentClassName', nextCur);
        setActiveTimelineClassNamesState(active => {
          const base = previous ? active : active.filter(n => n !== name);
          const source = base.length ? base : previousActive;
          const normalized = normalizeActiveTimelineClassNames(source, next, nextCur);
          safeSetItem('activeTimelineClassNames', JSON.stringify(normalized));
          return normalized;
        });
        return nextCur;
      });
      return next;
    });
    setLastImportBackup(null);
    safeRemoveItem(LAST_IMPORT_KEY);
    return restoredClasses;
  }, [lastImportBackup]);

  /**
   * Lagrer timeplan fra det nye visuelle ScheduleEditor-verktøyet.
   * @param {Object} schedule  - {Mandag: [{time, end, activity}], ...}
   * @param {Object} breaks    - {Mandag: [{time, end, activity}], ...}
   * @param {Object} subjectUpdates - {fagNavn: {color, emoji}, ...}
   * @param {string} className  - klassenavn (kan avvike fra currentClassName ved ny klasse)
   * @param {boolean} isMg      - fådelt-modus
   */
  const saveScheduleV2 = useCallback((schedule, breaks, subjectUpdates, className, isMg) => {
    setClassesState(prev => {
      const newClasses = { ...prev };

      // Opprett klassen om den ikke finnes
      if (!newClasses[className]) {
        newClasses[className] = cloneDefaultClass();
        newClasses[className].name = className;
      }

      const cd = newClasses[className];
      cd.multiGradeMode = !!isMg;
      if (isMg) cd.multiGradeLabels = getDefaultMultiGradeLabels(className);

      // Oppdater timeplan
      const days = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
      days.forEach(day => {
        cd.schedule[day] = (schedule[day] || [])
          .sort((a, b) => a.time.localeCompare(b.time));
        cd.breaks[day] = (breaks[day] || [])
          .sort((a, b) => a.time.localeCompare(b.time));
      });

      // Fagfarger og emojier: editorens palett er fasit for dette fag-settet,
      // slik at fag som er slettet i editoren ikke dukker opp igjen.
      // Pausefag (Pause/Mat/Storefri) ligger utenfor paletten og maa bevares.
      const BREAK_SUBJECTS = ["Pause", "Mat", "Storefri"];
      const keptColors = {};
      const keptEmojis = {};
      BREAK_SUBJECTS.forEach(name => {
        if (cd.subjectColors?.[name]) keptColors[name] = cd.subjectColors[name];
        if (cd.subjectEmojis?.[name]) keptEmojis[name] = cd.subjectEmojis[name];
      });
      Object.entries(subjectUpdates || {}).forEach(([name, { color, emoji }]) => {
        if (color) keptColors[name] = color;
        if (emoji) keptEmojis[name] = emoji;
      });
      cd.subjectColors = keptColors;
      cd.subjectEmojis = keptEmojis;

      Object.values(newClasses).forEach(ensureClassData);
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, []);

  const saveScheduleFromDraft = useCallback((draft) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      cd.multiGradeMode = draft.multiGradeMode;
      cd.multiGradeLabels = draft.labels;
      cd.mainTimes = JSON.parse(JSON.stringify(SCHOOL_MAIN_TIMES));

      const days = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
      days.forEach(day => {
        const newSchedule = [];
        const newBreaks = [];
        SCHOOL_DAY_FRAMES.forEach((frame) => {
          const frameDraft = draft.days?.[day]?.[frame.key] || {};
          const start = normalizeStoredTimeValue(frameDraft.overrideStart || frame.start);
          const end = normalizeStoredTimeValue(frameDraft.overrideEnd || frame.end);
          if (frame.type === 'break') {
            newBreaks.push({ time: start || frame.start, end: end || frame.end, activity: frame.activity, type: 'break' });
            return;
          }
          const activity = draft.multiGradeMode
            ? buildStoredActivityFromEditorFields(frameDraft.left, frameDraft.right, draft.labels)
            : canonicalizeSubjectName(frameDraft.single);
          if (!activity) return;
          newSchedule.push({
            time: start || frame.start,
            end: end || frame.end,
            activity: normalizeSubjectLabel(activity)
          });
        });
        cd.schedule[day] = sortEntriesByStart(newSchedule);
        cd.breaks[day] = sortEntriesByStart(newBreaks);
      });

      Object.values(newClasses).forEach(ensureClassData);
      safeSetItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  return {
    classes,
    currentClassName,
    currentClass: classes[currentClassName] || null,
    activeTimelineClassNames,
    tempScheduleChanges,
    editPermission,
    simState,
    themeMode,
    // Panel open states
    timerPanelOpen, setTimerPanelOpen,
    agendaOpen, setAgendaOpen,
    noteOpen, setNoteOpen,
    underTheHoodOpen, setUnderTheHoodOpen,
    underTheHoodView, setUnderTheHoodView,
    scheduleEditorDraft, setScheduleEditorDraft,
    timePickerOpen, setTimePickerOpen,
    toolboxOpen, setToolboxOpen,
    // Modal states
    editModal, setEditModal,
    activityModal, setActivityModal,
    countdownModal, setCountdownModal,
    loginModalOpen, setLoginModalOpen,
    colorDetailModal, setColorDetailModal,
    // Agenda subject
    agendaSubject, setAgendaSubject,
    // Actions
    selectClass,
    toggleTimelineClass,
    renameCurrentClass,
    deleteCurrentClass,
    addNewClass,
    setThemeMode,
    grantEditPermission,
    revokeEditPermission,
    resetToRealTime,
    applySimTime,
    saveClasses,
    updateTempSchedule,
    saveCountdown,
    deleteCountdown,
    toggleCountdownVisibility,
    saveAgendaItem,
    toggleAgendaItemCompleted,
    deleteAgendaItem,
    reorderAgendaItems,
    clearAgenda,
    saveAgendaTemplate,
    loadAgendaTemplate,
    saveSubjectColor,
    generatePalette,
    importSharedClass,
    undoLastImport,
    canUndoImport: !!lastImportBackup,
    lastImportInfo: lastImportBackup ? { name: lastImportBackup.name, at: lastImportBackup.at, replaced: !!lastImportBackup.previous } : null,
    saveScheduleV2,
    saveScheduleFromDraft,
    buildScheduleEditorDraftFromClass: (cls, name) =>
      buildScheduleEditorDraftFromClass(cls || classes[currentClassName], name || currentClassName),
    createEmptyScheduleEditorDraft: (mgm) =>
      createEmptyScheduleEditorDraft(mgm, classes[currentClassName], currentClassName),
    normalizeScheduleEditorDraftForCompare,
  };
}
