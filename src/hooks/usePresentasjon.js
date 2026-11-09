import { useCallback, useEffect, useRef, useState } from 'react';

/* «Vis for klassen»: ett trykk gir fullskjerm og en ren visning for elevene,
 * Esc (eller Tilbake-knappen) gir lærervisningen tilbake.
 *
 * Fullskjermen må bes om direkte i klikket (nettleseren krever en brukerhandling).
 * Går den ikke (iPad uten støtte, innebygd visning), blir det likevel ren visning.
 * Forlater nettleseren fullskjermen (Esc, F11, sveip), går vi også tilbake, så
 * læreren aldri står igjen i en halv tilstand. */

function fullskjermElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export default function usePresentasjon() {
  const [presenterer, setPresenterer] = useState(false);
  // Sann når det var vi som slo på fullskjermen, så vi bare slår av vår egen
  const vaarFullskjerm = useRef(false);

  const start = useCallback(() => {
    setPresenterer(true);
    if (fullskjermElement()) return;
    const root = document.documentElement;
    const be = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!be) return;
    try {
      vaarFullskjerm.current = true;
      const p = be.call(root);
      if (p && typeof p.catch === 'function') p.catch(() => { vaarFullskjerm.current = false; });
    } catch {
      vaarFullskjerm.current = false;
    }
  }, []);

  const avslutt = useCallback(() => {
    setPresenterer(false);
    if (!vaarFullskjerm.current) return;
    vaarFullskjerm.current = false;
    if (!fullskjermElement()) return;
    try {
      const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch { /* fullskjermen er allerede borte */ }
  }, []);

  useEffect(() => {
    if (!presenterer) return undefined;
    function onFullskjerm() {
      if (!fullskjermElement() && vaarFullskjerm.current) {
        vaarFullskjerm.current = false;
        setPresenterer(false);
      }
    }
    function onTast(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Fangstfasen: nedtelleren og panelene under skal ikke også lukke seg
      e.preventDefault();
      avslutt();
    }
    document.addEventListener('fullscreenchange', onFullskjerm);
    document.addEventListener('webkitfullscreenchange', onFullskjerm);
    window.addEventListener('keydown', onTast, true);
    document.body.classList.add('presenterer');
    return () => {
      document.removeEventListener('fullscreenchange', onFullskjerm);
      document.removeEventListener('webkitfullscreenchange', onFullskjerm);
      window.removeEventListener('keydown', onTast, true);
      document.body.classList.remove('presenterer');
    };
  }, [presenterer, avslutt]);

  return { presenterer, startPresentasjon: start, avsluttPresentasjon: avslutt };
}
