/**
 * Slår fullskjerm av og på for hele siden. Bruker webkit-variantene der
 * standarden mangler (eldre iPad-Safari), og kaster aldri.
 */
export async function vekslFullskjerm() {
  const root = document.documentElement;
  try {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    } else {
      alert('Fullskjerm støttes ikke her. På iPad: legg siden til på Hjem-skjermen og åpne den derfra.');
    }
  } catch (err) {
    console.warn('Kunne ikke endre fullskjerm:', err);
  }
}
