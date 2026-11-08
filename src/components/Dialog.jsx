import { useEffect, useId, useRef } from 'react';

const FOKUSERBAR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Felles dialog for alle verktøyene: mørkt bakteppe, instrumentpanel i midten.
 * Escape og trykk på bakteppet lukker (med mindre `laast` er satt, f.eks. mens
 * et spørsmål må besvares). `lukkPaaBakteppe={false}` lar Escape virke, men
 * ikke trykk utenfor. Tittelen blir dialogens tilgjengelige navn.
 *
 * Fokus: havner inne i dialogen når den åpner (det første feltet eller den
 * første knappen, med mindre barnet selv har fokusert noe), og går tilbake dit
 * det var når dialogen lukkes.
 */
export default function Dialog({
  open = true,
  onClose,
  title,
  titleId,
  children,
  className = '',
  bred = false,
  laast = false,
  lukkPaaBakteppe = true,
  skjulTittel = false,
}) {
  const autoId = useId();
  const labelId = titleId || autoId;
  const panelRef = useRef(null);
  // Et trykk som starter inne i panelet (f.eks. markering av tekst) og slippes
  // over bakteppet, skal ikke lukke dialogen.
  const trykkStartetPaaBakteppe = useRef(false);

  useEffect(() => {
    if (!open || laast) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      onClose?.();
    }
    // Fangstfasen: da ser nedtelleren og veggskjermen at Escape allerede er brukt
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, laast, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const forrige = document.activeElement;
    const id = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const first = panel.querySelector(FOKUSERBAR);
      (first || panel).focus();
    }, 80);
    return () => {
      clearTimeout(id);
      if (forrige && typeof forrige.focus === 'function' && document.contains(forrige)) forrige.focus();
    };
  }, [open]);

  if (!open) return null;

  const kanLukkeUtenfor = !laast && lukkPaaBakteppe;

  return (
    <div
      className="k-overlay"
      onPointerDown={e => { trykkStartetPaaBakteppe.current = e.target === e.currentTarget; }}
      onClick={e => {
        if (!kanLukkeUtenfor) return;
        if (e.target !== e.currentTarget || !trykkStartetPaaBakteppe.current) return;
        onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`k-dialog${bred ? ' k-dialog--bred' : ''} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? labelId : undefined}
        tabIndex={-1}
      >
        {title && (
          <h2 id={labelId} className={`k-dialog-title${skjulTittel ? ' visually-hidden' : ''}`}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
