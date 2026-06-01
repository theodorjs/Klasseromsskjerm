export function getMinutesFromTime(timeStr) {
  if (timeStr === null || timeStr === undefined) return 0;
  const raw = String(timeStr).trim();
  if (!raw) return 0;
  if (/^\d{1,4}$/.test(raw)) {
    const minutes = parseInt(raw, 10);
    return Number.isFinite(minutes) ? minutes : 0;
  }
  const parts = raw.split(/[:.]/).map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
  return parts[0] * 60 + parts[1];
}

export function formatDurationHoursMinutes(totalMinutes) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours} t ${minutes} min.`;
  if (hours > 0) return `${hours} t`;
  return `${minutes} min.`;
}

export function formatDurationSmart(totalMinutes) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  if (safeMinutes > 60) return formatDurationHoursMinutes(safeMinutes);
  return `${safeMinutes} min.`;
}

export function formatMinutesAsTime(minutes) {
  const safeMinutes = Math.max(0, parseInt(minutes || '0', 10));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Returns real Oslo time and day. Optionally reads simulated time from state.
 * @param {{ simDay?: string, simHour?: string, simMinute?: string }} simState
 */
export function getOsloTimeAndDay(simState = {}) {
  const now = new Date();
  const realOsloTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  let realDay = new Intl.DateTimeFormat('no-NO', {
    weekday: 'long',
    timeZone: 'Europe/Oslo'
  }).format(now);
  realDay = realDay.charAt(0).toUpperCase() + realDay.slice(1).toLowerCase();

  const { simDay, simHour, simMinute } = simState;

  const currentDay = simDay || realDay;
  const currentOsloTime = (simHour != null && simMinute != null)
    ? `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}`
    : realOsloTime;

  return { osloTime: currentOsloTime, currentDay, realDay, realOsloTime };
}

export function getOsloDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day)
  };
}

export function getIsoWeekNumberForOslo(date = new Date()) {
  const { year, month, day } = getOsloDateParts(date);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
}
