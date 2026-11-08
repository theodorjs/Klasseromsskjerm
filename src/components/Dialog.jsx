import { useEffect, useId } from 'react';

/**
 * Felles dialog for alle verktøyene: mørkt bakteppe, instrumentpanel i midten.
 * Escape og trykk på bakteppet lukker (med mindre `laast` er satt, f.eks. mens
 * et spørsmål må besvares). Tittelen blir dialogens tilgjengelige navn.
 *
 *   <Dialog title="Ny nedtelling" onClose={...}>
 *     ...felter...
 *     <div className="k-dialog-actions">...knapper...</div>
 *   </Dialog>
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
  skjulTittel = false,
}) {
  const autoId = useId();
  const labelId = titleId || autoId;

  useEffect(() => {
    if (!open || laast) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, laast, onClose]);

  if (!open) return null;

  return (
    <div className="k-overlay" onClick={laast ? undefined : onClose}>
      <div
        className={`k-dialog${bred ? ' k-dialog--bred' : ''} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? labelId : undefined}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2 id={labelId} className={`k-dialog-title${skjulTittel ? ' visually-hidden' : ''}`}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
