import { getSubjectDefaultColor } from '../utils/color.js';
import {
  getActivitySubjectParts,
  canonicalizeSubjectName,
} from '../utils/schedule.js';

function getUniqueSubjects(currentClass) {
  const subjects = new Set();
  ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"].forEach(day => {
    const combined = [
      ...(currentClass.schedule?.[day] || []),
      ...(currentClass.breaks?.[day] || [])
    ];
    combined.forEach(entry => {
      const activity = entry.activity;
      if (!activity) return;
      if (["Pause", "Mat", "Storefri"].includes(activity)) {
        subjects.add(activity);
        return;
      }
      getActivitySubjectParts(activity).forEach(segment => {
        const normalized = canonicalizeSubjectName(segment.subject);
        if (normalized) subjects.add(normalized);
      });
    });
  });
  return Array.from(subjects).sort();
}

export default function SubjectColorPicker({ currentClass, onPickColor, onBack, onGeneratePalette }) {
  const subjects = getUniqueSubjects(currentClass);

  return (
    <div className="editor-container schedule-editor-container subject-color-editor-container">
      <h2 className="subject-color-title">🎨 Fagfarger</h2>
      <p style={{ color: '#aaa', marginBottom: 10 }}>Klikk på et fag for å endre farge og emoji</p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="neumorphic-btn" onClick={onGeneratePalette}>Generer palett</button>
        <button className="neumorphic-btn" onClick={onBack}>Tilbake</button>
      </div>
      <div className="subject-grid">
        {subjects.map(subject => {
          const color = currentClass.subjectColors?.[subject] || getSubjectDefaultColor(subject);
          return (
            <div
              key={subject}
              className="subject-color-box"
              style={{ background: color }}
              onClick={() => onPickColor(subject)}
            >
              <span className="subject-name">{subject}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
