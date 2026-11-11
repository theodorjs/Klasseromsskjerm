import { useCallback, useEffect, useRef, useState } from 'react';

/** Hvor lenge ballongen sprekker før kortet tas bort (samme som i del-bursdag.css). */
export const SPREKK_MS = 750;

function vilHaRo() {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

/**
 * Lar en ballong sprekke med animasjon før den tas bort for resten av dagen.
 * Svarer { sprekker: nøklene som sprekker nå, sprekk(nokkel) }.
 * Med «redusert bevegelse» forsvinner den med en gang, uten animasjon.
 */
export default function useSprekkBallong(onSprekk) {
  const [sprekker, setSprekker] = useState([]);
  const tidtakere = useRef(new Map());
  const siste = useRef(onSprekk);
  useEffect(() => { siste.current = onSprekk; }, [onSprekk]);

  // Byttes visningen midt i smellet, blir ballongen likevel borte
  useEffect(() => {
    const venter = tidtakere.current;
    return () => {
      venter.forEach((id, nokkel) => { clearTimeout(id); siste.current?.(nokkel); });
      venter.clear();
    };
  }, []);

  const sprekk = useCallback((nokkel) => {
    if (tidtakere.current.has(nokkel)) return;
    if (vilHaRo()) { siste.current?.(nokkel); return; }
    setSprekker(s => [...s, nokkel]);
    tidtakere.current.set(nokkel, setTimeout(() => {
      tidtakere.current.delete(nokkel);
      setSprekker(s => s.filter(k => k !== nokkel));
      siste.current?.(nokkel);
    }, SPREKK_MS));
  }, []);

  return { sprekker, sprekk };
}
