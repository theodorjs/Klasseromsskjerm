import { safeGetItem } from './storage.js';

/** Nøkkelen temaet lagres under (0 lys, 1 mørk, 2 stjerner, 3 fargerik). */
export const TEMA_KEY = 'preferredMode';

export function lesTema() {
  return safeGetItem(TEMA_KEY) || '2';
}

/** Setter klassene på <body> som stilene for hvert tema henger på. */
export function applyBodyClasses(themeMode) {
  const mode = String(themeMode);
  document.body.classList.remove('light-mode', 'dark-mode', 'star-mode', 'colorful-mode', 'ui-light', 'ui-dark');
  if (mode === '0') document.body.classList.add('light-mode', 'ui-light');
  else if (mode === '1') document.body.classList.add('dark-mode', 'ui-dark');
  else if (mode === '2') document.body.classList.add('star-mode', 'ui-dark');
  else document.body.classList.add('colorful-mode', 'ui-light');
}
