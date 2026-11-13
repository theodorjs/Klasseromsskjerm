import { useRef, useState, useSyncExternalStore } from 'react';
import ScheduleEditor from './ScheduleEditor.jsx';
import SubjectColorPicker from './SubjectColorPicker.jsx';
import { downloadBackup, parseBackupFile, applyBackup } from '../utils/backup.js';
import Ikon from './Ikon.jsx';
import Ballong from './Ballong.jsx';
import Bursdagsliste from './Bursdagsliste.jsx';
import { kanSeBursdager, skoleTjeneste, innloggingsadresse, forlatElev, lyttTilTjeneste, lesTjenesteTilstand } from '../utils/ksTjeneste.js';
import OmKlasseskjerm, { Signatur } from './OmKlasseskjerm.jsx';

export default function SplitScreen({
  open,
  view, // 'classGrid' | 'scheduleEditor' | 'subjectColors' | 'bursdager'
  setView,
  classes,
  currentClassName,
  currentClass,
  activeTimelineClassNames,
  editPermission,
  onClose,
  onToggleLock,
  onOpenTimePicker,
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
  const [omOpen, setOmOpen] = useState(false);
  // Elevmodus på skolens adresse: i stedet for «Lås opp» kan en lærer logge inn med Feide
  const [tjeneste] = useState(() => skoleTjeneste());
  const { elev } = useSyncExternalStore(lyttTilTjeneste, lesTjenesteTilstand);
  const elevmodus = !!tjeneste && elev;

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
    // For alle, også låst: se hvordan skjermen ser ut en annen dag eller tid.
    // Låst opp ligger den nederst i «Klasser»-boksen, så det ikke blir en ekstra rad.
    const tidInnhold = (
      <>
        <h3 className="k-group-title">Se en annen tid</h3>
        <div className="k-group-row">
          <button className="k-btn" id="tool-calendar" onClick={onOpenTimePicker}><Ikon navn="calendar-clock" /> Velg tid</button>
        </div>
        <p className="info">Sjekk timeplanen en annen dag eller tid. «Simulert tid» står øverst til du går tilbake til nå.</p>
      </>
    );

    return (
      <div className="klasse-meny har-fast-tilbake">
        <button className="k-btn k-btn--tilbake k-btn--liten k-tilbake-fast" id="class-back-btn" onClick={onClose}><Ikon navn="arrow-left" /> Tilbake<span className="k-skjul-smal"> til skjermen</span></button>
        {/* Låsen hører til innstillingene: fast øverst til høyre, speilet av «Tilbake» */}
        {elevmodus ? (
          <button className="k-btn k-btn--liten k-las-fast" id="tool-teacher-login"
            title="Gå ut av elevmodus og logg inn med Feide"
            onClick={() => { forlatElev(); window.location.assign(innloggingsadresse(tjeneste)); }}>
            <Ikon navn="lock" /> Logg inn som lærer
          </button>
        ) : (
          <button className={`k-btn k-btn--liten k-las-fast${editPermission ? '' : ' k-btn--ny'}`} id="tool-lock" onClick={onToggleLock}>
            <Ikon navn={editPermission ? 'lock-open' : 'lock'} /> <span id="lock-label">{editPermission ? 'Lås igjen' : 'Lås opp'}</span>
          </button>
        )}
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
                {isActiveClass && <span className="class-card-badge">Vises nå</span>}
                <span className="class-card-title">{className}</span>
                <label
                  className="class-select-toggle"
                  aria-label={`Vis ${className} i tidslinjen`}
                  title={isTimelineActive ? 'Vises i tidslinjen' : 'Vis i tidslinjen'}
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
            <Ikon navn="lock" /> {elevmodus
              ? 'Logg inn som lærer øverst til høyre'
              : 'Trykk «Lås opp» øverst til høyre'} for å endre timeplan, fag og klasser{kanSeBursdager() ? ' og se bursdagene' : ''}.
          </p>
        )}

        {editPermission && (
          <div className="klasse-grupper">
            {currentClassName && classes[currentClassName] && (
              <section className="k-group" aria-label={`Verktøy for ${currentClassName}`}>
                <h3 className="k-group-title">Denne klassen: {currentClassName}</h3>
                <div className="k-group-grid">
                  <button className="k-btn k-btn--rediger" id="edit-schedule-btn" onClick={() => setView('scheduleEditor')}><Ikon navn="pencil" /> Rediger timeplan</button>
                  <button className="k-btn k-btn--regnbue" id="subject-color-btn" onClick={() => setView('subjectColors')}><Ikon navn="palette" /> Fagfarger</button>
                  <button className="k-btn k-btn--navn" id="rename-class-btn" onClick={() => {
                    const oldName = currentClassName;
                    const input = prompt("Nytt navn på klassen:", oldName);
                    if (input === null) return;
                    const newName = input.trim();
                    if (!newName) { alert("Klassen må ha et navn."); return; }
                    if (newName === oldName) return;
                    if (classes[newName]) { alert("En klasse med dette navnet finnes allerede."); return; }
                    onRenameClass(oldName, newName);
                  }}><Ikon navn="pencil" /> Gi nytt navn</button>
                  <button className="k-btn k-btn--slett" id="delete-class-btn" onClick={() => {
                    const names = Object.keys(classes);
                    if (names.length <= 1) { alert("Du må ha minst én klasse."); return; }
                    if (confirm(`Slette klassen "${currentClassName}"?`)) {
                      onDeleteClass(currentClassName);
                    }
                  }}><Ikon navn="trash-2" /> Slett klasse</button>
                  {kanSeBursdager() && (
                    <button className="k-btn k-btn--bursdag k-btn--hel" id="birthdays-btn" onClick={() => setView('bursdager')}>
                      <Ballong navn={currentClassName} className="k-btn-ballong" /> Bursdager
                    </button>
                  )}
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
              <div className="k-group-del" role="group" aria-label="Se skjermen på en annen tid">{tidInnhold}</div>
            </section>

            <section className="k-group" aria-label="Deling og sikkerhetskopi">
              <h3 className="k-group-title">Deling og sikkerhetskopi</h3>
              <div className="k-group-grid">
                {currentClassName && classes[currentClassName] && (
                  <button className="k-btn" id="share-class-btn" onClick={onOpenShare}><Ikon navn="link" /> Del timeplan</button>
                )}
                <button className="k-btn" id="backup-download-btn" onClick={handleDownloadBackup}><Ikon navn="download" /> Sikkerhets­kopi</button>
                <button className="k-btn" id="backup-restore-btn" onClick={() => fileInputRef.current?.click()}><Ikon navn="upload" /> Gjen­opprett</button>
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
                  }}><Ikon navn="undo-2" /> Angre mottatt</button>
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

        {!editPermission && (
          <div className="klasse-grupper">
            <section className="k-group" aria-label="Se skjermen på en annen tid">{tidInnhold}</section>
          </div>
        )}

        {/* Opphav og «Om» hører til innstillingene, ikke til verktøyene i timen */}
        <footer className="klasse-fot">
          <Signatur onClick={() => setOmOpen(true)} />
        </footer>
        {omOpen && <OmKlasseskjerm onClose={() => setOmOpen(false)} />}
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
      {view === 'bursdager' && editPermission && kanSeBursdager() && currentClassName && (
        <Bursdagsliste klassenavn={currentClassName} onBack={() => setView('classGrid')} />
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
