/** Veggskjerm: egen visning for en liten skjerm langt unna. Valget huskes per enhet. */
export const WALL_MODE_KEY = 'visningsmodus';

/** Veggskjerm er på når adressen sier det (?visning=vegg), eller når enheten har valgt det før. */
export function readWallModePreference() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('visning') === 'vegg') return true;
    return window.localStorage.getItem(WALL_MODE_KEY) === 'vegg';
  } catch {
    return false;
  }
}
