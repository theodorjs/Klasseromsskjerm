import { useRef, useState } from 'react';
import ScheduleEditor from './ScheduleEditor.jsx';
import SubjectColorPicker from './SubjectColorPicker.jsx';
import { downloadBackup, parseBackupFile, applyBackup } from '../utils/backup.js';

export default function SplitScreen({
  open,
  view, // 'classGrid' | 'scheduleEditor' | 'subjectColors'
  setView,
  classes,
  currentClassName,
  currentClass,
  activeTimelineClassNames,
  editPermission,
  onClose,
  onSelectClass,
  onToggleTimelineClass,
  onAddNewClass,
  onRenameClass,
  onDeleteClass,
  onSaveScheduleV2,
  onPickColor,
  onGeneratePalette,
  onOpenColorModal,
  onOpenShare,
  canUndoImport,
  lastImportInfo,
  onUndoImport,
}) {
  const fileInputRef = useRef(null);
  const [dataMessage, setDataMessage] = useState(null); // { text, kind: 'ok' | 'error' }

  // Meldingen hører til økten i panelet, ikke til neste gang det åpnes
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setDataMessage(null);
  }

  if (!open) return null;

  function handleDownloadBackup() {
    const ok = downloadBackup();
    setDataMessage(ok
      ? { text: 'Sikkerhetskopien er laget – sjekk Nedlastinger, og ta vare på filen et trygt sted.', kind: 'ok' }
      : { text: 'Kunne ikke lage sikkerhetskopi i denne nettleseren.', kind: 'error' });
  }

  async function handleRestoreFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupFile(text);
      const when = parsed.exportedAt
        ? new Date(parsed.exportedAt).toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'ukjent dato';
      const list = parsed.classNames.join(', ');
      if (!confirm(`Gjenopprette ${parsed.classCount} ${parsed.classCount === 1 ? 'klasse' : 'klasser'} (${list}) fra sikkerhetskopi tatt ${when}?\n\nDagens oppsett på denne maskinen erstattes.`)) return;
      applyBackup(parsed);
    } catch (err) {
      setDataMessage({ text: err?.message || 'Kunne ikke lese filen.', kind: 'error' });
    }
  }

  function renderClassGrid() {
    return (
      <div className="klasse-meny">
        <h1 className="class-tool-title">Velg klasse</h1>
        <div className="class-grid" id="class-grid">
          {Object.keys(classes).map(className => {
            const isActiveClass = className === currentClassName;
            const isTimelineActive = activeTimelineClassNames.includes(className);
            return (
              <div
                key={className}
                className={`class-card${isActiveClass ? ' active' : ''}`}
                onClick={() => onSelectClass(className)}
              >
                <span className="class-card-title">{className}</span>
                <label
                  className="class-select-toggle"
                  aria-label="Velg klasse i tidslinjen"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleTimelineClass(className); }}
                >
                  <input
                    type="checkbox"
                    checked={isTimelineActive}
                    readOnly
                    onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleTimelineClass(className); }}
                  />
                  <span className="class-select-checkmark"></span>
                </label>
              </div>
            );
          })}
        </div>
        {!editPermission && (
          <p className="klasse-laas">
            🔒 Logg inn med «Lås opp» i verktøykassen for å endre timeplan, fag og klasser.
          </p>
        )}

        {editPermission && (
          <div className="klasse-grupper">
            {currentClassName && classes[currentClassName] && (
              <section className="k-group" aria-label={`Verktøy for ${currentClassName}`}>
                <h3 className="k-group-title">Denne klassen: {currentClassName}</h3>
                <div className="k-group-grid">
                  <button className="k-btn k-btn--rediger" id="edit-schedule-btn" onClick={() => setView('scheduleEditor')}>🖊 Rediger timeplan</button>
                  <button className="k-btn k-btn--regnbue" id="subject-color-btn" onClick={() => setView('subjectColors')}>🎨 Fagfarger</button>
                  <button className="k-btn k-btn--navn" id="rename-class-btn" onClick={() => {
                    const oldName = currentClassName;
                    const input = prompt("Nytt navn på klassen:", oldName);
                    if (input === null) return;
                    const newName = input.trim();
                    if (!newName) { alert("Klassen må ha et navn."); return; }
                    if (newName === oldName) return;
                    if (classes[newName]) { alert("En klasse med dette navnet finnes allerede."); return; }
                    onRenameClass(oldName, newName);
                  }}>✎ Gi nytt navn</button>
                  <button className="k-btn k-btn--slett" id="delete-class-btn" onClick={() => {
                    const names = Object.keys(classes);
                    if (names.length <= 1) { alert("Du må ha minst én klasse."); return; }
                    if (confirm(`Slette klassen "${currentClassName}"?`)) {
                      onDeleteClass(currentClassName);
                    }
                  }}>🗑 Slett klasse</button>
                </div>
              </section>
            )}

            <section className="k-group" aria-label="Alle klasser">
              <h3 className="k-group-title">Klasser</h3>
              <div className="k-group-row">
                <button className="k-btn k-btn--ny" id="new-class-btn" onClick={() => {
                  const name = prompt("Navn på ny klasse:");
                  if (name) {
                    if (classes[name]) { alert("En klasse med dette navnet finnes allerede."); return; }
                    onAddNewClass(name);
                    onSelectClass(name);
                  }
                }}>+ Ny klasse</button>
              </div>
              <p className="info">Huk av klassene som skal vises i tidslinjen. Trykk på kortet for å velge hvilken klasse skjermen følger.</p>
            </section>

            <section className="k-group" aria-label="Deling og sikkerhetskopi">
              <h3 className="k-group-title">Deling og sikkerhetskopi</h3>
              <div className="k-group-grid">
                {currentClassName && classes[currentClassName] && (
                  <button className="k-btn" id="share-class-btn" onClick={onOpenShare}>🔗 Del timeplan</button>
                )}
                <button className="k-btn" id="backup-download-btn" onClick={handleDownloadBackup}>⬇ Sikkerhetskopi</button>
                <button className="k-btn" id="backup-restore-btn" onClick={() => fileInputRef.current?.click()}>⬆ Gjenopprett</button>
                {canUndoImport && lastImportInfo && (
                  <button className="k-btn" id="undo-import-btn" onClick={() => {
                    const when = lastImportInfo.at
                      ? new Date(lastImportInfo.at).toLocaleString('no-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
                      : '';
                    const what = lastImportInfo.replaced
                      ? `Legge tilbake timeplanen «${lastImportInfo.name}» slik den var før den ble oppdatert fra lenke${when ? ` ${when}` : ''}?`
                      : `Fjerne klassen «${lastImportInfo.name}» som ble lagt til fra lenke${when ? ` ${when}` : ''}?`;
                    if (confirm(what)) {
                      onUndoImport();
                      setDataMessage({ text: 'Forrige timeplan er lagt tilbake.', kind: 'ok' });
                    }
                  }}>↩ Angre mottatt</button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={handleRestoreFile}
              />
            </section>
          </div>
        )}
        {editPermission && dataMessage && (
          <p className={`class-tool-msg${dataMessage.kind === 'error' ? ' is-error' : ''}`} role="status">
            {dataMessage.text}
          </p>
        )}

        <button className="k-btn k-btn--tilbake" id="class-back-btn" onClick={onClose}>← Tilbake til skjermen</button>
      </div>
    );
  }

  return (
    <div id="under-the-hood" className="noise-bg">
      {view === 'classGrid' && renderClassGrid()}
      {view === 'scheduleEditor' && editPermission && (
        <ScheduleEditor
          currentClass={currentClass}
          currentClassName={currentClassName}
          onSave={(schedule, breaks, subjectUpdates, className, isMg) => {
            onSaveScheduleV2(schedule, breaks, subjectUpdates, className, isMg);
          }}
          onBack={() => setView('classGrid')}
        />
      )}
      {view === 'subjectColors' && editPermission && (
        <SubjectColorPicker
          currentClass={currentClass}
          onPickColor={(subject) => onOpenColorModal(subject)}
          onBack={() => setView('classGrid')}
          onGeneratePalette={onGeneratePalette}
        />
      )}
    </div>
  );
}
