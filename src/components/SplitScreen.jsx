import ScheduleEditor from './ScheduleEditor.jsx';
import SubjectColorPicker from './SubjectColorPicker.jsx';

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
}) {
  if (!open) return null;

  function renderClassGrid() {
    return (
      <div style={{ width: '100%' }}>
        <div className="noise-bg"></div>
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
        <div style={{ marginTop: 50 }}>
          <button className="neumorphic-btn" onClick={onClose}>Tilbake</button>
          <button className="neumorphic-btn" onClick={() => {
            const name = prompt("Navn på ny klasse:");
            if (name) {
              if (classes[name]) { alert("En klasse med dette navnet finnes allerede."); return; }
              onAddNewClass(name);
              onSelectClass(name);
            }
          }}>+ Ny klasse</button>
          {currentClassName && classes[currentClassName] && (
            <>
              <button className="neumorphic-btn" id="rename-class-btn" onClick={() => {
                const oldName = currentClassName;
                const input = prompt("Nytt navn på klassen:", oldName);
                if (input === null) return;
                const newName = input.trim();
                if (!newName) { alert("Klassen må ha et navn."); return; }
                if (newName === oldName) return;
                if (classes[newName]) { alert("En klasse med dette navnet finnes allerede."); return; }
                onRenameClass(oldName, newName);
              }}>Gi nytt navn</button>
              <button className="neumorphic-btn" id="delete-class-btn" onClick={() => {
                const names = Object.keys(classes);
                if (names.length <= 1) { alert("Du må ha minst én klasse."); return; }
                if (confirm(`Slette klassen "${currentClassName}"?`)) {
                  onDeleteClass(currentClassName);
                }
              }}>Slett klasse</button>
              <button className="neumorphic-btn" id="edit-schedule-btn" onClick={() => setView('scheduleEditor')}>Rediger timeplan</button>
              <button className="neumorphic-btn" id="subject-color-btn" onClick={() => setView('subjectColors')}>🎨 Fagfarger</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="under-the-hood" className="noise-bg">
      {view === 'classGrid' && renderClassGrid()}
      {view === 'scheduleEditor' && (
        <ScheduleEditor
          currentClass={currentClass}
          currentClassName={currentClassName}
          onSave={(schedule, breaks, subjectUpdates, className, isMg) => {
            onSaveScheduleV2(schedule, breaks, subjectUpdates, className, isMg);
          }}
          onBack={() => setView('classGrid')}
        />
      )}
      {view === 'subjectColors' && (
        <SubjectColorPicker
          currentClass={currentClass}
          onPickColor={(subject) => onOpenColorModal(subject)}
          onBack={() => setView(scheduleEditorDraft ? 'scheduleEditor' : 'classGrid')}
          onGeneratePalette={onGeneratePalette}
        />
      )}
    </div>
  );
}
