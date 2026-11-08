/**
 * Gjør et fast plassert panel flyttbart ved å dra i et håndtak.
 * Bruker pekerhendelser, så det virker med finger på iPad like godt som med mus.
 * Trykk på knapper, felt og redigerbar tekst inne i håndtaket flytter ikke panelet.
 *
 * Returnerer en funksjon som fjerner lytterne igjen.
 */
export function makeDraggablePanel(el, handle) {
  if (!el || !handle) return () => {};

  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let activeId = null;

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest('input, button, select, textarea, label, a, [contenteditable]')) return;
    const rect = el.getBoundingClientRect();
    // Lås panelet til der det står nå, så transform/right ikke slår inn under flyttingen
    el.style.transform = 'none';
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    activeId = e.pointerId;
    try { handle.setPointerCapture(e.pointerId); } catch { /* eldre nettlesere */ }
    e.preventDefault();
  }

  function onMove(e) {
    if (activeId === null || e.pointerId !== activeId) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxLeft = Math.max(0, window.innerWidth - w);
    const maxTop = Math.max(0, window.innerHeight - 48); // håndtaket skal alltid kunne nås
    const left = Math.min(maxLeft, Math.max(0, startLeft + (e.clientX - startX)));
    const top = Math.min(maxTop, Math.max(0, startTop + (e.clientY - startY)));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    void h;
  }

  function onUp(e) {
    if (activeId === null || e.pointerId !== activeId) return;
    activeId = null;
    try { handle.releasePointerCapture(e.pointerId); } catch { /* ignorer */ }
  }

  handle.addEventListener('pointerdown', onDown);
  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
  handle.style.touchAction = 'none';

  return () => {
    handle.removeEventListener('pointerdown', onDown);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
  };
}
