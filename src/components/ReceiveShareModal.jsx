import { useEffect, useRef } from 'react';
import Dialog from './Dialog.jsx';
import Info from './Info.jsx';
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
    body = <p className="k-feil" role="alert">{state.error}</p>;
    actions = <button ref={primaryRef} type="button" className="k-btn k-btn--tilbake" onClick={onClose}>Lukk</button>;
  } else if (status === 'done') {
    title = state.replaced ? `«${name}» er oppdatert` : `«${name}» er lagt til`;
    body = (
      <>
        <p className="k-dialog-tekst">
          Timeplanen vises nå på denne skjermen. Du finner den igjen under 🏫 Klasse og timeplan.
        </p>
        <Info>Endringer læreren gjør senere kommer ikke automatisk. Da trengs en ny lenke.</Info>
      </>
    );
    actions = (
      <>
        <button ref={primaryRef} type="button" className="k-btn k-btn--ny k-btn--fylt" onClick={onClose}>Ferdig</button>
        {canUndo && (
          <button type="button" className="k-btn k-btn--tilbake" onClick={onUndo}>Angre</button>
        )}
      </>
    );
  } else if (status === 'ask') {
    title = hasExisting ? `Oppdatere klassen «${name}»?` : `Legge til klassen «${name}»?`;
    body = (
      <>
        <p className="k-dialog-tekst">
          Noen har delt en timeplan med deg
          {sharedDate ? ` (${sharedDate})` : ''}. Den inneholder {lessons} {lessons === 1 ? 'økt' : 'økter'} per uke
          {payload?.multiGradeMode ? ' for en fådelt klasse' : ''}.
        </p>
        {hasExisting && (
          <Info felt>
            Du har allerede en klasse med dette navnet. Timeplan, pauser og fagfarger erstattes.
            Agenda og nedtellinger beholdes, og du kan angre etterpå.
          </Info>
        )}
      </>
    );
    actions = (
      <>
        <button ref={primaryRef} type="button" className={`k-btn k-btn--fylt ${hasExisting ? 'k-btn--rediger' : 'k-btn--ny'}`} onClick={onAccept}>
          {hasExisting ? 'Oppdater' : 'Legg til'}
        </button>
        <button type="button" className="k-btn k-btn--tilbake" onClick={onClose}>Avbryt</button>
      </>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title={title} titleId="receive-share-title" className="share-modal">
      {body}
      <div className="k-dialog-actions">{actions}</div>
    </Dialog>
  );
}
