import { SCHOOL_DAY_FRAMES, SCHOOL_MAIN_TIMES, subjectMap } from '../data/constants.js';
import { getMinutesFromTime, formatMinutesAsTime, getIsoWeekNumberForOslo } from './time.js';

export function normalizeSubjectLabel(rawLabel) {
  const cleaned = String(rawLabel || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .replace(/(\d+)\.?\s*-\s*(\d+)\.?(?=\s|$)/g, '$1.-$2.')
    .replace(/(\s\d+)\.(?=\s|$)/g, '$1.');
}

export function stripGradeSuffix(rawLabel) {
  const normalized = normalizeSubjectLabel(rawLabel);
  if (!normalized) return '';
  return normalized
    .replace(/\s+\d+\.-\d+\.?$/, '')
    .replace(/\s+\d+\.?$/, '')
    .trim();
}

export function extractGradesFromName(className) {
  const matches = String(className || '').match(/\d+/g) || [];
  return [...new Set(matches)].slice(0, 2);
}

export function getDefaultMultiGradeLabels(className) {
  const grades = extractGradesFromName(className);
  if (grades.length === 2) return [`${grades[0]}.`, `${grades[1]}.`];
  if (grades.length === 1) return [`${grades[0]}.`, ''];
  return ['A.', 'B.'];
}

export function parseActivitySubjectSegment(rawSegment) {
  const normalized = normalizeSubjectLabel(rawSegment);
  if (!normalized) return { subject: '', grades: [] };
  const sharedMatch = normalized.match(/^(.*?)(?:\s+(\d+)\.-(\d+)\.?)$/);
  if (sharedMatch) {
    return {
      subject: sharedMatch[1].trim(),
      grades: [sharedMatch[2], sharedMatch[3]]
    };
  }
  const singleMatch = normalized.match(/^(.*?)(?:\s+(\d+)\.?)$/);
  if (singleMatch) {
    return {
      subject: singleMatch[1].trim(),
      grades: [singleMatch[2]]
    };
  }
  return { subject: normalized, grades: [] };
}

export function getActivitySubjectParts(activityLabel) {
  return String(activityLabel || '')
    .split('/')
    .map(segment => parseActivitySubjectSegment(segment))
    .filter(segment => segment.subject);
}

export function canonicalizeSubjectName(rawLabel) {
  const normalized = stripGradeSuffix(rawLabel);
  if (!normalized) return '';
  const upper = normalized.toUpperCase();
  const aliasMap = {
    "KUNST OG HÅNDTVERK": "Kunst og håndverk",
    "GYM": "Kroppsøving",
    "FYSAK": "Fys.ak."
  };
  if (aliasMap[upper]) return aliasMap[upper];
  const subjectInfo = Object.values(subjectMap).find(subject =>
    subject.full.toUpperCase() === upper || subject.short.toUpperCase() === upper
  );
  return subjectInfo ? subjectInfo.full : normalized;
}

export function getEditorSubjectOptions(classes) {
  const options = new Set();
  Object.values(subjectMap).forEach((subject) => {
    const full = canonicalizeSubjectName(subject.full);
    if (!full || ["Pause", "Mat", "Storefri"].includes(full)) return;
    options.add(full);
  });
  Object.values(classes).forEach((classData) => {
    Object.values(classData.schedule || {}).forEach((entries) => {
      (entries || []).forEach((entry) => {
        getActivitySubjectParts(entry.activity).forEach((segment) => {
          const canonical = canonicalizeSubjectName(segment.subject);
          if (canonical && !["Pause", "Mat", "Storefri"].includes(canonical)) {
            options.add(canonical);
          }
        });
      });
    });
  });
  return Array.from(options).sort((a, b) => a.localeCompare(b, 'no'));
}

export function parseEditorActivityFields(activityLabel, labels) {
  const [leftLabel, rightLabel] = labels.map(label => String(label || '').replace(/\./g, ''));
  const segments = getActivitySubjectParts(activityLabel);
  if (!segments.length) return { left: '', right: '' };

  if (segments.length === 1) {
    const segment = segments[0];
    if (segment.grades.length === 2 && segment.grades.includes(leftLabel) && segment.grades.includes(rightLabel)) {
      const canonical = canonicalizeSubjectName(segment.subject);
      return { left: canonical, right: canonical };
    }
    if (segment.grades.length === 1) {
      const canonical = canonicalizeSubjectName(segment.subject);
      if (segment.grades[0] === leftLabel) return { left: canonical, right: '' };
      if (segment.grades[0] === rightLabel) return { left: '', right: canonical };
    }
    const canonical = canonicalizeSubjectName(segment.subject);
    if (leftLabel && !rightLabel) return { left: canonical, right: '' };
    if (!leftLabel && rightLabel) return { left: '', right: canonical };
    return { left: canonical, right: canonical };
  }

  let left = '';
  let right = '';
  segments.forEach((segment) => {
    const canonical = canonicalizeSubjectName(segment.subject);
    if (segment.grades.includes(leftLabel)) left = canonical;
    if (segment.grades.includes(rightLabel)) right = canonical;
  });
  return { left, right };
}

export function buildStoredActivityFromEditorFields(leftValue, rightValue, labels) {
  const left = canonicalizeSubjectName(leftValue);
  const right = canonicalizeSubjectName(rightValue);
  if (!left && !right) return '';
  if (left && !right) return left;
  if (!left && right) return right;
  if (left.toLowerCase() === right.toLowerCase()) return left;
  return `${left} ${labels[0]} / ${right} ${labels[1]}`;
}

export function getClassMultiGradeLabels(classData, currentClassName) {
  const name = classData?.name || currentClassName || '';
  const extractedGrades = extractGradesFromName(name);
  if (extractedGrades.length === 1 && classData?.multiGradeMode !== true) {
    return [`${extractedGrades[0]}.`, ''];
  }
  const labels = Array.isArray(classData?.multiGradeLabels) && classData.multiGradeLabels.length === 2
    ? classData.multiGradeLabels
    : getDefaultMultiGradeLabels(name);
  return labels.map((label) => String(label || '').trim());
}

export function isClassMultiGrade(classData, currentClassName) {
  if (typeof classData?.multiGradeMode === 'boolean') return classData.multiGradeMode;
  return extractGradesFromName(classData?.name || currentClassName || '').length === 2;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeSubjectKeyMap(map, mergeArrays = false) {
  const source = map && typeof map === 'object' ? map : {};
  const normalized = {};
  Object.entries(source).forEach(([key, value]) => {
    const normalizedKey = normalizeSubjectLabel(key);
    if (!normalizedKey) return;
    if (mergeArrays && Array.isArray(value)) {
      if (!Array.isArray(normalized[normalizedKey])) normalized[normalizedKey] = [];
      normalized[normalizedKey].push(...JSON.parse(JSON.stringify(value)));
      return;
    }
    if (normalized[normalizedKey] === undefined) {
      normalized[normalizedKey] = value;
    }
  });
  return normalized;
}

export function isValidCountdownTime(value) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return false;
  const [hours, minutes] = String(value).split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function normalizeCountdownTimeEntry(value) {
  const rawValue = String(value || '').trim();
  if (/^\d{1,2}:\d{2}$/.test(rawValue)) {
    const [hours, minutes] = rawValue.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  if (/^\d{3,4}$/.test(rawValue)) {
    const padded = rawValue.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }
  return rawValue;
}

export function getSafeCountdownTime(value) {
  const time = normalizeCountdownTimeEntry(value);
  return isValidCountdownTime(time) ? time : '00:00';
}

export function normalizeCountdownEntries(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const title = String(item.title || '').trim();
      const targetDate = String(item.targetDate || '').trim();
      const targetTime = getSafeCountdownTime(item.targetTime);
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return null;
      return {
        id: item.id || `countdown-${Date.now()}-${index}`,
        title,
        targetDate,
        targetTime
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

export function isFixedBreakActivity(activityLabel) {
  const normalized = normalizeSubjectLabel(activityLabel);
  return ["Pause", "Mat", "Storefri"].includes(normalized);
}

export function normalizeStoredTimeValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return '';
  const value = String(rawValue).trim();
  if (!value) return '';
  if (/^\d{1,4}$/.test(value)) {
    const minutes = parseInt(value, 10);
    if (Number.isFinite(minutes) && minutes >= 0 && minutes < 24 * 60) {
      return formatMinutesAsTime(minutes);
    }
  }
  return value;
}

export function normalizeScheduleEntries(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      return {
        ...entry,
        time: normalizeStoredTimeValue(entry.time),
        end: normalizeStoredTimeValue(entry.end),
        activity: normalizeSubjectLabel(entry.activity)
      };
    })
    .filter((entry) => entry && entry.time && entry.end);
}

export function normalizeMainTimes(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const start = normalizeStoredTimeValue(entry.start);
      const end = normalizeStoredTimeValue(entry.end);
      if (!start || !end) return null;
      return { start, end };
    })
    .filter(Boolean);
}

export function sortEntriesByStart(entries) {
  return [...(Array.isArray(entries) ? entries : [])]
    .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));
}

export function ensureClassData(classData) {
  if (!classData) return;
  if (classData.schedule && typeof classData.schedule === 'object') {
    Object.keys(classData.schedule).forEach((day) => {
      classData.schedule[day] = normalizeScheduleEntries(classData.schedule[day]);
    });
  }
  if (classData.breaks && typeof classData.breaks === 'object') {
    Object.keys(classData.breaks).forEach((day) => {
      classData.breaks[day] = normalizeScheduleEntries(classData.breaks[day]);
    });
  }
  classData.mainTimes = normalizeMainTimes(classData.mainTimes || []);
  classData.subjectColors = normalizeSubjectKeyMap(classData.subjectColors || {});
  classData.subjectEmojis = normalizeSubjectKeyMap(classData.subjectEmojis || {});
  classData.agendas = normalizeSubjectKeyMap(classData.agendas || {}, true);
  classData.templates = normalizeSubjectKeyMap(classData.templates || {}, true);
  classData.customCountdowns = normalizeCountdownEntries(classData.customCountdowns || []);
  classData.countdownsVisible = classData.countdownsVisible !== false;
  if (typeof classData.multiGradeMode !== 'boolean') {
    classData.multiGradeMode = extractGradesFromName(classData.name || '').length === 2;
  }
  classData.multiGradeLabels = getClassMultiGradeLabels(classData);
}

export function normalizeActiveTimelineClassNames(list, classes, currentClassName) {
  const uniqueValid = [...new Set((Array.isArray(list) ? list : []).filter(name => classes[name]))];
  const fallbackName = classes[currentClassName] ? currentClassName : Object.keys(classes)[0];
  if (fallbackName && !uniqueValid.includes(fallbackName)) {
    uniqueValid.unshift(fallbackName);
  }
  return uniqueValid.slice(0, 2);
}

export function getTempScheduleKey(className, day, time) {
  return `${className}::${day}-${time}`;
}

export function getTempScheduleValue(className, day, time, fallbackValue, tempScheduleChanges) {
  const scopedKey = getTempScheduleKey(className, day, time);
  const legacyKey = `${day}-${time}`;
  if (Object.prototype.hasOwnProperty.call(tempScheduleChanges.changes, scopedKey)) {
    return tempScheduleChanges.changes[scopedKey];
  }
  if (Object.prototype.hasOwnProperty.call(tempScheduleChanges.changes, legacyKey)) {
    return tempScheduleChanges.changes[legacyKey];
  }
  return fallbackValue;
}

export function getClassScheduleState(className, currentDay, currentMinutes, classes, tempScheduleChanges, weekNumber = null) {
  const classData = classes[className];
  if (!classData || !classData.schedule) return null;
  ensureClassData(classData);

  // Ukeparitet: en økt kan gjelde bare partalls- eller oddetallsuker.
  const activeWeek = Number.isFinite(weekNumber) ? weekNumber : getIsoWeekNumberForOslo();
  const weekParityNow = activeWeek % 2 === 0 ? 'partall' : 'oddetall';
  const matchesWeek = (entry) => !entry?.weekParity || entry.weekParity === weekParityNow;

  const todaySchedule = [...(classData.schedule[currentDay] || [])]
    .filter(matchesWeek)
    .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));
  const breakSchedule = [...(classData.breaks?.[currentDay] || [])]
    .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));
  const mondaySchedule = [...(classData.schedule["Mandag"] || [])]
    .filter(matchesWeek)
    .sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));
  const schoolDayStart = getMinutesFromTime("08:30");
  const fallbackSchoolDayDuration = ["Mandag", "Torsdag", "Fredag"].includes(currentDay) ? 360 : 305;
  const fallbackSchoolDayEnd = schoolDayStart + fallbackSchoolDayDuration;
  const firstClassTime = todaySchedule.length ? getMinutesFromTime(todaySchedule[0].time) : schoolDayStart;
  const mondaySchoolStart = mondaySchedule.length ? getMinutesFromTime(mondaySchedule[0].time) : schoolDayStart;

  const mergedDayEvents = [
    ...todaySchedule.map(event => ({ ...event, type: "class" })),
    ...breakSchedule.map(event => ({ ...event, type: "break" }))
  ].sort((a, b) => getMinutesFromTime(a.time) - getMinutesFromTime(b.time));

  const normalizedDayEvents = mergedDayEvents.map((event, index) => {
    const start = getMinutesFromTime(event.time);
    const explicitEnd = event.end ? getMinutesFromTime(event.end) : null;
    const nextStart = index + 1 < mergedDayEvents.length
      ? getMinutesFromTime(mergedDayEvents[index + 1].time)
      : fallbackSchoolDayEnd;
    const end = explicitEnd !== null ? explicitEnd : nextStart;
    const displayActivity = getTempScheduleValue(className, currentDay, event.time, event.activity, tempScheduleChanges);
    return { ...event, start, end, displayActivity };
  });

  const schoolDayEnd = normalizedDayEvents.length
    ? Math.max(...normalizedDayEvents.map(event => event.end))
    : fallbackSchoolDayEnd;

  let currentActivity = "FRI";
  let currentEventEnd = null;
  const activeEvent = normalizedDayEvents.find(event => currentMinutes >= event.start && currentMinutes < event.end);
  if (activeEvent) {
    currentEventEnd = activeEvent.end;
    currentActivity = activeEvent.displayActivity || activeEvent.activity;
  }

  return {
    className,
    classData,
    todaySchedule,
    breakSchedule,
    mondaySchedule,
    normalizedDayEvents,
    schoolDayStart,
    schoolDayEnd,
    firstClassTime,
    mondaySchoolStart,
    currentActivity,
    currentEventEnd,
    activeEvent
  };
}

export function getSubjectInfoFromActivityLabel(activityLabel) {
  const subjectPart = canonicalizeSubjectName(activityLabel).toUpperCase();
  if (!subjectPart) return null;
  return Object.values(subjectMap).find(s =>
    s.full.toUpperCase() === subjectPart || s.short.toUpperCase() === subjectPart
  ) || null;
}

export function getClassBadgeLabel(className) {
  const gradeMatch = String(className || '').match(/\d+/);
  if (gradeMatch) return `${gradeMatch[0]}.`;
  const clean = String(className || '').trim();
  return clean ? `${clean.slice(0, 2).toUpperCase()}` : '?';
}

export function getClassInlineLabel(className) {
  const gradeMatch = String(className || '').match(/\d+/);
  if (gradeMatch) return gradeMatch[0];
  return String(className || '').trim();
}

export function formatExpandedActivityLabel(activityLabel) {
  const parsed = parseActivitySubjectSegment(activityLabel);
  if (!parsed.subject) return 'Fri';
  const subjectInfo = getSubjectInfoFromActivityLabel(parsed.subject);
  const baseLabel = subjectInfo ? subjectInfo.full : parsed.subject;
  if (parsed.grades.length === 2) {
    return `${baseLabel} ${parsed.grades[0]}.-${parsed.grades[1]}.`;
  }
  if (parsed.grades.length === 1) {
    return `${baseLabel} ${parsed.grades[0]}.`;
  }
  return baseLabel;
}

export function formatExpandedActivityDisplay(activityText) {
  return String(activityText || '')
    .split('/')
    .map(part => formatExpandedActivityLabel(part))
    .join(' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCurrentActivityLinesForState(state) {
  if (!state) return [];
  if (state.currentActivity === "FRI") {
    return [`${getClassInlineLabel(state.className)}: Fri`];
  }

  // Parallelle fag gjelder elever på tvers av trinn - vis dem som egne linjer
  // uten trinn-etikett, i stedet for a dele dem per klasse.
  if (state.activeEvent?.parallel) {
    return String(state.currentActivity)
      .split('/')
      .map(part => formatExpandedActivityLabel(part.trim()))
      .filter(Boolean);
  }

  const labels = getClassMultiGradeLabels(state.classData, state.className);
  if (isClassMultiGrade(state.classData, state.className)) {
    const fields = parseEditorActivityFields(state.currentActivity, labels);
    const leftActivity = fields.left || fields.right || stripGradeSuffix(state.currentActivity);
    const rightActivity = fields.right || fields.left || stripGradeSuffix(state.currentActivity);
    const lines = [];
    if (labels[0]) lines.push(`${labels[0]} ${formatExpandedActivityLabel(leftActivity)}`.trim());
    if (labels[1]) lines.push(`${labels[1]} ${formatExpandedActivityLabel(rightActivity)}`.trim());
    return lines.filter(Boolean);
  }

  return [`${getClassInlineLabel(state.className)}: ${formatExpandedActivityDisplay(state.currentActivity)}`];
}

export function getStoredSubjectEmoji(className, activityLabel, classes) {
  const trimmed = normalizeSubjectLabel(activityLabel);
  if (!trimmed) return '❓';
  const classData = classes[className];
  const baseSubject = stripGradeSuffix(trimmed);
  if (classData && classData.subjectEmojis) {
    if (classData.subjectEmojis[trimmed]) return classData.subjectEmojis[trimmed];
    if (baseSubject && classData.subjectEmojis[baseSubject]) return classData.subjectEmojis[baseSubject];
  }
  const subjectInfo = getSubjectInfoFromActivityLabel(trimmed);
  return subjectInfo?.emoji || '❓';
}

export function getCountdownRemainingDisplay(targetDate, targetTime = '00:00') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || ''))) {
    return { value: 0, unit: 'DAGER' };
  }

  const now = new Date();
  const [year, month, day] = String(targetDate).split('-').map(Number);
  const safeTargetTime = getSafeCountdownTime(targetTime);
  const [hours, minutes] = safeTargetTime.split(':').map(Number);
  const target = new Date(year, month - 1, day, hours, minutes);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { value: 0, unit: 'MINUTTER' };
  }

  const minuteMs = 60000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diff < hourMs) {
    const mins = Math.max(1, Math.floor(diff / minuteMs));
    return { value: mins, unit: mins === 1 ? 'MINUTT' : 'MINUTTER' };
  }

  if (diff < dayMs) {
    const hrs = Math.max(1, Math.floor(diff / hourMs));
    return { value: hrs, unit: hrs === 1 ? 'TIME' : 'TIMER' };
  }

  const days = Math.ceil(diff / dayMs);
  return { value: days, unit: days === 1 ? 'DAG' : 'DAGER' };
}

export function buildScheduleEditorDraftFromClass(currentClass, currentClassName) {
  const days = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"];
  const multiGradeMode = isClassMultiGrade(currentClass, currentClassName);
  const labels = getClassMultiGradeLabels(currentClass, currentClassName);
  const draft = { multiGradeMode, labels, days: {} };

  days.forEach((day) => {
    const scheduleEntries = sortEntriesByStart(currentClass.schedule[day] || []);
    const lessonEntries = scheduleEntries.filter((entry) => !isFixedBreakActivity(entry.activity));
    const breakEntries = sortEntriesByStart([
      ...(currentClass.breaks[day] || []),
      ...scheduleEntries.filter((entry) => isFixedBreakActivity(entry.activity))
    ]);
    let lessonIndex = 0;
    const usedBreakIndexes = new Set();
    draft.days[day] = {};

    SCHOOL_DAY_FRAMES.forEach((frame) => {
      let entry = null;
      if (frame.type === 'lesson') {
        entry = lessonEntries[lessonIndex++] || null;
      } else {
        const matchIndex = breakEntries.findIndex((candidate, index) =>
          !usedBreakIndexes.has(index) &&
          normalizeSubjectLabel(candidate.activity) === frame.activity
        );
        if (matchIndex !== -1) {
          usedBreakIndexes.add(matchIndex);
          entry = breakEntries[matchIndex];
        }
      }
      const activity = frame.type === 'break' ? frame.activity : (entry?.activity || '');
      const hasOverride = !!entry && (
        normalizeStoredTimeValue(entry.time) !== frame.start ||
        normalizeStoredTimeValue(entry.end) !== frame.end
      );
      const splitFields = multiGradeMode ? parseEditorActivityFields(activity, labels) : { left: '', right: '' };
      draft.days[day][frame.key] = {
        single: frame.type === 'lesson' ? activity : frame.activity,
        left: splitFields.left,
        right: splitFields.right,
        overrideStart: hasOverride ? entry.time : '',
        overrideEnd: hasOverride ? entry.end : ''
      };
    });
  });

  return draft;
}

export function createEmptyScheduleEditorDraft(multiGradeMode, currentClass, currentClassName) {
  const labels = getClassMultiGradeLabels(currentClass, currentClassName);
  const draft = { multiGradeMode, labels, days: {} };

  ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"].forEach((day) => {
    draft.days[day] = {};
    SCHOOL_DAY_FRAMES.forEach((frame) => {
      draft.days[day][frame.key] = {
        single: frame.type === 'break' ? frame.activity : '',
        left: '',
        right: '',
        overrideStart: '',
        overrideEnd: ''
      };
    });
  });

  return draft;
}

export function normalizeScheduleEditorDraftForCompare(draft) {
  if (!draft) return '';
  const normalized = {
    multiGradeMode: !!draft.multiGradeMode,
    labels: (draft.labels || []).map((label) => String(label || '').trim()),
    days: {}
  };
  ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"].forEach((day) => {
    normalized.days[day] = {};
    SCHOOL_DAY_FRAMES.forEach((frame) => {
      const cell = draft.days?.[day]?.[frame.key] || {};
      normalized.days[day][frame.key] = {
        single: canonicalizeSubjectName(cell.single || ''),
        left: canonicalizeSubjectName(cell.left || ''),
        right: canonicalizeSubjectName(cell.right || ''),
        overrideStart: normalizeStoredTimeValue(cell.overrideStart || ''),
        overrideEnd: normalizeStoredTimeValue(cell.overrideEnd || '')
      };
    });
  });
  return JSON.stringify(normalized);
}

// Color palette generation utilities
export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function linearToSrgbCompanded(channel) {
  if (channel <= 0.0031308) return 12.92 * channel;
  return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

function oklchToLinearSrgb(oklch) {
  const hue = ((typeof oklch.h === 'number' ? oklch.h : 0) % 360 + 360) % 360;
  const hueRad = hue * Math.PI / 180;
  const a = oklch.c * Math.cos(hueRad);
  const b = oklch.c * Math.sin(hueRad);

  const l_ = oklch.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = oklch.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = oklch.l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
  };
}

function oklchToSrgb(oklch) {
  const linear = oklchToLinearSrgb(oklch);
  return {
    r: linearToSrgbCompanded(linear.r),
    g: linearToSrgbCompanded(linear.g),
    b: linearToSrgbCompanded(linear.b)
  };
}

function isSrgbInGamut(rgb) {
  return rgb.r >= 0 && rgb.r <= 1 && rgb.g >= 0 && rgb.g <= 1 && rgb.b >= 0 && rgb.b <= 1;
}

function fitToSRGB(oklch) {
  let c = Math.max(0, oklch.c);
  for (let k = 0; k < 30; k++) {
    const candidate = { mode: 'oklch', l: oklch.l, c, h: oklch.h };
    const rgb = oklchToSrgb(candidate);
    if (isSrgbInGamut(rgb)) return candidate;
    c *= 0.92;
  }
  return { mode: 'oklch', l: oklch.l, c: 0, h: oklch.h };
}

function srgbToHex(rgb) {
  const r = Math.round(clampNumber(rgb.r, 0, 1) * 255);
  const g = Math.round(clampNumber(rgb.g, 0, 1) * 255);
  const b = Math.round(clampNumber(rgb.b, 0, 1) * 255);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function generateMutedPaletteColors(n, options = {}) {
  const {
    startH = 0,
    endH = 360,
    baseL = 0.60,
    baseC = 0.24,
    jitterL = 0.025,
    jitterC = 0.05
  } = options;

  const colors = [];
  const rawSpan = endH - startH;
  let hueSpan = ((rawSpan % 360) + 360) % 360;
  if (Math.abs(hueSpan) < 1e-6) hueSpan = 360;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / n;
    const h = (startH + hueSpan * t) % 360;

    let l = baseL + (Math.random() * 2 - 1) * jitterL;
    let c = baseC + (Math.random() * 2 - 1) * jitterC;

    if (h <= 95) c += 0.022;
    if (h >= 190 && h <= 245) c += 0.018;
    if (h >= 250 && h <= 320) c += 0.025;
    if (h >= 45 && h <= 85) l += 0.02;
    if (h >= 155 && h <= 230) l -= 0.012;

    l = clampNumber(l, 0.46, 0.82);
    c = clampNumber(c, 0.11, 0.36);

    const fitted = fitToSRGB({ mode: 'oklch', l, c, h });
    const rgb = oklchToSrgb(fitted);
    colors.push(srgbToHex(rgb));
  }
  return colors;
}
