import { useEffect, useRef } from 'react';
import { countLessonsInPayload } from '../utils/share.js';

function formatSharedDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('no-NO', { day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' });
}

/**
 * Vises når siden åpnes med en #del=-lenke.
 * state: { status: 'ask' | 'done' | 'error', payload, error, replaced }
 */
export default function ReceiveShareModal({ state, hasExisting, canUndo, onAccept, onUndo, onClose }) {
  const open = !!state;
  const status = state?.status;
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Flytt fokus til hovedknappen når dialogen åpnes eller skifter tilstand
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => primaryRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open, status]);

  const payload = state?.payload;
  const name = payload?.name || '';
  const lessons = payload ? countLessonsInPayload(payload) : 0;
  const sharedDate = payload ? formatSharedDate(payload.updatedAt) : null;

  let title = '';
  let body = null;
  let actions = null;

  if (status === 'error') {
    title = 'Kunne ikke åpne timeplanen';
    body = <p className="modal-error">{state.error}</p>;
    actions = <button ref={primaryRef} type="button" className="neumorphic-btn" onClick={onClose}>Lukk</button>;
  } else if (status === 'done') {
    title = state.replaced ? `«${name}» er oppdatert` : `«${name}» er lagt til`;
    body = (
      <>
        <p className="modal-help">
          Timeplanen vises nå på denne skjermen. Du finner den igjen under 🏫 Klasse og timeplan.
        </p>
        <p className="modal-note">
          Endringer læreren gjør senere kommer ikke automatisk – da trengs en ny lenke.
        </p>
      </>
    );
    actions = (
      <>
        <button ref={primaryRef} type="button" className="neumorphic-btn primary" onClick={onClose}>Ferdig</button>
        {canUndo && (
          <button type="button" className="neumorphic-btn" onClick={onUndo}>Angre</button>
        )}
      </>
    );
  } else if (status === 'ask') {
    title = hasExisting ? `Oppdatere klassen «${name}»?` : `Legge til klassen «${name}»?`;
    body = (
      <>
        <p className="modal-help">
          Noen har delt en timeplan med deg
          {sharedDate ? ` (${sharedDate})` : ''}. Den inneholder {lessons} {lessons === 1 ? 'økt' : 'økter'} per uke
          {payload?.multiGradeMode ? ' for en fådelt klasse' : ''}.
        </p>
        {hasExisting && (
          <p className="modal-help is-warning">
            Du har allerede en klasse med dette navnet. Timeplan, pauser og fagfarger erstattes.
            Agenda og nedtellinger beholdes, og du kan angre etterpå.
          </p>
        )}
      </>
    );
    actions = (
      <>
        <button ref={primaryRef} type="button" className="neumorphic-btn primary" onClick={onAccept}>
          {hasExisting ? 'Oppdater' : 'Legg til'}
        </button>
        <button type="button" className="neumorphic-btn" onClick={onClose}>Avbryt</button>
      </>
    );
  }

  return (
    <>
      {open && <div className="share-backdrop" onClick={status === 'ask' ? undefined : onClose} aria-hidden="true" />}
      <div className={`edit-modal share-modal${open ? ' active' : ''}`} id="receive-share-modal" role="dialog" aria-modal="true" aria-labelledby="receive-share-title">
        <h2 id="receive-share-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>{title}</h2>
        {body}
        <div className="modal-actions">{actions}</div>
      </div>
    </>
  );
}
