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

function loadClasses() {
  let classes = {};
  try {
    const savedData = localStorage.getItem('klasseromData');
    if (savedData) classes = JSON.parse(savedData);
  } catch (e) {
    console.error("Error parsing klasseromData", e);
  }

  if (!classes || Object.keys(classes).length === 0) {
    classes = { [DEFAULT_CLASS_NAME]: cloneDefaultClass() };
    classes[DEFAULT_CLASS_NAME].name = DEFAULT_CLASS_NAME;
    localStorage.setItem('klasseromData', JSON.stringify(classes));
    localStorage.setItem('currentClassName', DEFAULT_CLASS_NAME);
  }

  // Migration: 9A -> 7. og 8.
  const classNamesAfterLoad = Object.keys(classes);
  if (classNamesAfterLoad.length === 1 && classNamesAfterLoad[0] === "9A") {
    classes["7. og 8."] = classes["9A"];
    classes["7. og 8."].name = "7. og 8.";
    delete classes["9A"];
    localStorage.setItem('klasseromData', JSON.stringify(classes));
    const storedCurrentClassName = localStorage.getItem('currentClassName');
    if (!storedCurrentClassName || storedCurrentClassName === "9A") {
      localStorage.setItem('currentClassName', "7. og 8.");
    }
    try {
      const savedActive = JSON.parse(localStorage.getItem('activeTimelineClassNames') || '[]');
      if (Array.isArray(savedActive)) {
        const migrated = savedActive.map(name => name === "9A" ? "7. og 8." : name);
        localStorage.setItem('activeTimelineClassNames', JSON.stringify(migrated));
      }
    } catch (e) {}
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
      localStorage.setItem('klasseromData', JSON.stringify(classes));
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
      localStorage.setItem('klasseromData', JSON.stringify(classes));
    }
  })();

  Object.values(classes).forEach(ensureClassData);

  // Apply lower grade standard colors (one-time migration)
  const migrationKey = 'lowerGradeStandardColorsApplied_v1';
  if (localStorage.getItem(migrationKey) !== 'true') {
    let didChange = false;
    ["5. trinn", "6. trinn"].forEach((className) => {
      const cd = classes[className];
      if (!cd) return;
      ensureClassData(cd);
      cd.subjectColors = { ...cd.subjectColors, ...LOWER_GRADE_STANDARD_COLORS };
      didChange = true;
    });
    if (didChange) localStorage.setItem('klasseromData', JSON.stringify(classes));
    localStorage.setItem(migrationKey, 'true');
  }

  return classes;
}

function loadTempScheduleChanges() {
  let temp = { date: "", changes: {} };
  try {
    const saved = sessionStorage.getItem('tempScheduleChanges');
    if (saved) temp = JSON.parse(saved);
  } catch (e) {}
  const todayDate = new Date().toISOString().split('T')[0];
  if (temp.date !== todayDate) {
    temp = { date: todayDate, changes: {} };
    sessionStorage.setItem('tempScheduleChanges', JSON.stringify(temp));
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
    let name = localStorage.getItem('currentClassName') || Object.keys(c)[0];
    if (!c[name]) name = Object.keys(c)[0];
    return name;
  });

  const [activeTimelineClassNames, setActiveTimelineClassNamesState] = useState(() => {
    const c = loadClasses();
    let name = localStorage.getItem('currentClassName') || Object.keys(c)[0];
    if (!c[name]) name = Object.keys(c)[0];
    let list = [];
    try {
      const saved = JSON.parse(localStorage.getItem('activeTimelineClassNames') || '[]');
      if (Array.isArray(saved)) list = saved;
    } catch (e) {}
    return normalizeActiveTimelineClassNames(list, c, name);
  });

  const [tempScheduleChanges, setTempScheduleChangesState] = useState(() => loadTempScheduleChanges());
  const [editPermission, setEditPermissionState] = useState(() => sessionStorage.getItem('isTeacher') === 'true');

  // Simulated time: null values mean real time
  const [simState, setSimState] = useState({ simDay: null, simHour: null, simMinute: null });

  // Theme
  const [themeMode, setThemeModeState] = useState(() => localStorage.getItem('preferredMode') || '2');

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

  // Internal helper to save classes to state + localStorage
  const saveClasses = useCallback((newClasses) => {
    const copy = { ...newClasses };
    Object.values(copy).forEach(ensureClassData);
    localStorage.setItem('klasseromData', JSON.stringify(copy));
    setClassesState(copy);
    return copy;
  }, []);

  const updateTempSchedule = useCallback((updater) => {
    setTempScheduleChangesState(prev => {
      const next = updater(prev);
      sessionStorage.setItem('tempScheduleChanges', JSON.stringify(next));
      return next;
    });
  }, []);

  // Actions
  const selectClass = useCallback((name) => {
    setCurrentClassNameState(name);
    localStorage.setItem('currentClassName', name);

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
        localStorage.setItem('activeTimelineClassNames', JSON.stringify(normalized));
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
            localStorage.setItem('currentClassName', newCur);
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
        localStorage.setItem('activeTimelineClassNames', JSON.stringify(normalized));
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
      const shiftValue = localStorage.getItem(oldShiftKey);
      if (shiftValue !== null) {
        localStorage.setItem(newShiftKey, shiftValue);
        localStorage.removeItem(oldShiftKey);
      }

      localStorage.setItem('currentClassName', newName);
      setCurrentClassNameState(newName);

      setActiveTimelineClassNamesState(tl => {
        const newTl = tl.map(n => n === oldName ? newName : n);
        const normalized = normalizeActiveTimelineClassNames(newTl, newClasses, newName);
        localStorage.setItem('activeTimelineClassNames', JSON.stringify(normalized));
        return normalized;
      });

      Object.values(newClasses).forEach(ensureClassData);
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('currentClassName', nextName);
      setCurrentClassNameState(nextName);
      ensureClassData(newClasses[nextName]);

      setActiveTimelineClassNamesState(tl => {
        const newTl = tl.filter(n => n !== name);
        const normalized = normalizeActiveTimelineClassNames(newTl, newClasses, nextName);
        localStorage.setItem('activeTimelineClassNames', JSON.stringify(normalized));
        return normalized;
      });

      Object.values(newClasses).forEach(ensureClassData);
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
    // selectClass will be called from the component after this
  }, []);

  const setThemeMode = useCallback((mode) => {
    const m = String(mode);
    setThemeModeState(m);
    localStorage.setItem('preferredMode', m);
  }, []);

  const grantEditPermission = useCallback(() => {
    setEditPermissionState(true);
    sessionStorage.setItem('isTeacher', 'true');
  }, []);

  const revokeEditPermission = useCallback(() => {
    setEditPermissionState(false);
    sessionStorage.setItem('isTeacher', 'false');
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
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      ensureClassData(cd);
      if (!Array.isArray(cd.customCountdowns)) cd.customCountdowns = [];
      if (editingIndex !== null && cd.customCountdowns[editingIndex]) {
        cd.customCountdowns[editingIndex] = payload;
      } else if (cd.customCountdowns.length < 3) {
        cd.customCountdowns.push(payload);
      }
      cd.countdownsVisible = true;
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const toggleCountdownVisibility = useCallback(() => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      cd.countdownsVisible = cd.countdownsVisible === false;
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  // Agenda actions
  const saveAgendaItem = useCallback((subject, payload, editingIndex) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd) return prev;
      if (!cd.agendas) cd.agendas = {};
      if (!cd.agendas[subject]) cd.agendas[subject] = [];
      if (editingIndex !== null && cd.agendas[subject][editingIndex] !== undefined) {
        const existing = cd.agendas[subject][editingIndex];
        cd.agendas[subject][editingIndex] = { ...existing, ...payload, completed: existing.completed };
      } else {
        cd.agendas[subject].push(payload);
      }
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const toggleAgendaItemCompleted = useCallback((subject, index) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd?.agendas?.[subject]?.[index] === undefined) return prev;
      cd.agendas[subject][index].completed = !cd.agendas[subject][index].completed;
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

  const deleteAgendaItem = useCallback((subject, index) => {
    setClassesState(prev => {
      const newClasses = { ...prev };
      const cd = newClasses[currentClassName];
      if (!cd?.agendas?.[subject]) return prev;
      cd.agendas[subject] = cd.agendas[subject].filter((_, i) => i !== index);
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      const rawShift = parseInt(localStorage.getItem(shiftKey) || '0', 10);
      const currentShift = Number.isFinite(rawShift) ? ((rawShift % paletteSize) + paletteSize) % paletteSize : 0;
      const step = 360 / paletteSize;
      const startH = currentShift * step;
      const palette = generateMutedPaletteColors(subjects.length, { startH, endH: startH + 360 });

      const newClasses = { ...prev };
      const newCd = newClasses[currentClassName];
      if (!newCd.subjectColors) newCd.subjectColors = {};
      subjects.forEach((subj, idx) => { newCd.subjectColors[subj] = palette[idx]; });
      localStorage.setItem(shiftKey, String((currentShift + 1) % paletteSize));
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
      return newClasses;
    });
  }, [currentClassName]);

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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
      localStorage.setItem('klasseromData', JSON.stringify(newClasses));
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
    saveScheduleV2,
    saveScheduleFromDraft,
    buildScheduleEditorDraftFromClass: (cls, name) =>
      buildScheduleEditorDraftFromClass(cls || classes[currentClassName], name || currentClassName),
    createEmptyScheduleEditorDraft: (mgm) =>
      createEmptyScheduleEditorDraft(mgm, classes[currentClassName], currentClassName),
    normalizeScheduleEditorDraftForCompare,
  };
}
