import { useEffect } from 'react';

/* Holder skjermen våken så lenge `aktiv` er sann.
 *
 * 1. Screen Wake Lock API (Safari 16.4+, også i hjemskjerm-appen fra iPadOS 18.4).
 *    Låsen slippes av systemet når appen går i bakgrunnen, så vi ber om den
 *    igjen når siden blir synlig.
 * 2. Reserve for eldre iPader (som veggskjermen på iPadOS 14): en liten, svart,
 *    lydløs video som går i løkke utenfor skjermen. Så lenge en video spiller,
 *    slukker ikke iPaden skjermen. */

const VIDEO_SRC = `${import.meta.env.BASE_URL}vaaken.mp4`;

function lagVideo() {
  const v = document.createElement('video');
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  v.setAttribute('aria-hidden', 'true');
  v.muted = true;
  v.loop = true;
  v.src = VIDEO_SRC;
  v.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;opacity:0;pointer-events:none;';
  return v;
}

export default function useSkjermVaaken(aktiv) {
  useEffect(() => {
    if (!aktiv) return undefined;
    let avsluttet = false;
    let laas = null;
    let video = null;

    const harWakeLock = typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';

    async function be() {
      if (avsluttet || document.visibilityState !== 'visible') return;
      if (harWakeLock) {
        try {
          const ny = await navigator.wakeLock.request('screen');
          if (avsluttet) { ny.release().catch(() => {}); return; }
          laas = ny;
          return;
        } catch {
          // Nektet (f.eks. eldre hjemskjerm-app): bruk videoen i stedet
        }
      }
      if (!video) {
        video = lagVideo();
        document.body.appendChild(video);
      }
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    function onSynlighet() {
      if (document.visibilityState === 'visible' && (!laas || laas.released)) be();
    }

    be();
    document.addEventListener('visibilitychange', onSynlighet);
    return () => {
      avsluttet = true;
      document.removeEventListener('visibilitychange', onSynlighet);
      if (laas && !laas.released) laas.release().catch(() => {});
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
      }
    };
  }, [aktiv]);
}
