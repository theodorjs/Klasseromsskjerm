import { safeGetItem } from './storage.js';
import { aktivSkole } from '../data/skoletema.js';

/** Nøkkelen temaet lagres under (0 lys, 1 mørk, 2 stjerner, 3 fargerik, 4 skolens farger). */
export const TEMA_KEY = 'preferredMode';

/** Temaet med skolens farger. Finnes bare på en skoles egen nettside (se src/data/skoletema.js). */
export const SKOLETEMA = '4';

/**
 * Temaet som skal vises. På skolens nettside er skolens farger standard for
 * den som ikke har valgt selv. Andre steder finnes ikke skoletemaet, så et
 * lagret «4» (for eksempel fra en forhåndsvisning med ?skole=) blir Stjerner.
 */
export function lesTema() {
  const lagret = safeGetItem(TEMA_KEY);
  const skole = aktivSkole();
  if (!lagret) return skole ? SKOLETEMA : '2';
  if (lagret === SKOLETEMA && !skole) return '2';
  return lagret;
}

/** Lyse temaer: lyst glass og mørk tekst. */
export function erLystTema(themeMode) {
  const mode = String(themeMode);
  return mode === '0' || mode === '3' || mode === SKOLETEMA;
}

/** Setter klassene på <body> som stilene for hvert tema henger på. */
export function applyBodyClasses(themeMode) {
  const mode = String(themeMode);
  document.body.classList.remove('light-mode', 'dark-mode', 'star-mode', 'colorful-mode', 'skole-mode', 'ui-light', 'ui-dark');
  if (mode === '0') document.body.classList.add('light-mode', 'ui-light');
  else if (mode === '1') document.body.classList.add('dark-mode', 'ui-dark');
  else if (mode === '2') document.body.classList.add('star-mode', 'ui-dark');
  // Skolens farger bygger på Lys; del-skoletema.css legger fargene oppå
  else if (mode === SKOLETEMA) document.body.classList.add('light-mode', 'skole-mode', 'ui-light');
  else document.body.classList.add('colorful-mode', 'ui-light');
}
