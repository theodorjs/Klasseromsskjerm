import { useCallback, useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '../utils/storage.js';

/** Om skiva ved siden av faget i «Nå»-boksen vises. Huskes på enheten. */
export const VIS_SKIVE_KEY = 'klasseskjerm.visSkive';

/** Lagringshendelsen når bare andre faner; denne når de andre visningene i samme fane. */
const ENDRET = 'klasseskjerm:visSkive';

/** Valget i minnet også, så knappen virker selv om lagringen er blokkert. */
let iMinnet = null;

function lesVisSkive() {
  const lagret = safeGetItem(VIS_SKIVE_KEY);
  if (lagret === 'nei') return false;
  if (lagret === 'ja') return true;
  return iMinnet ?? true;
}

/**
 * Felles valg for hovedtavla og elevvisningen (stående iPad): skjuler
 * læreren skiva i den ene, er den skjult i den andre også, og i andre faner.
 */
export default function useVisSkive() {
  const [vis, setVis] = useState(lesVisSkive);

  useEffect(() => {
    const oppdater = () => setVis(lesVisSkive());
    function naarLagret(e) { if (e.key === null || e.key === VIS_SKIVE_KEY) oppdater(); }
    window.addEventListener('storage', naarLagret);
    window.addEventListener(ENDRET, oppdater);
    return () => {
      window.removeEventListener('storage', naarLagret);
      window.removeEventListener(ENDRET, oppdater);
    };
  }, []);

  const veksle = useCallback(() => {
    iMinnet = !lesVisSkive();
    safeSetItem(VIS_SKIVE_KEY, iMinnet ? 'ja' : 'nei');
    window.dispatchEvent(new Event(ENDRET));
  }, []);

  return [vis, veksle];
}
