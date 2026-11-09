import { useState, useRef, useEffect } from 'react';
import Ikon, { FagSymbol } from './Ikon.jsx';
import { normalizeSubjectLabel, formatExpandedActivityLabel } from '../utils/schedule.js';
import { getReadableAgendaTextColor, getSubjectDefaultColor } from '../utils/color.js';
import { makeDraggablePanel } from '../utils/drag.js';


export default function AgendaSidebar({
  open,
  onClose,
  currentClass,
  agendaSubject,
  onSetSubject,
  editPermission,
  onAddItem,
  onEditItem,
  onToggleItem,
  onDeleteItem,
  onReorder,
  onClearAgenda,
  onSaveTemplate,
  onLoadTemplate,
}) {
  const sidebarRef = useRef(null);
  const handleRef = useRef(null);
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);

  useEffect(() => {
    if (sidebarRef.current && handleRef.current) {
      return makeDraggablePanel(sidebarRef.current, handleRef.current);
    }
  }, [open]);

  if (!currentClass) return null;

  // Get unique subjects from schedule
  const subjects = new Set();
  Object.values(currentClass.schedule || {}).forEach(dayArr => {
    (dayArr || []).forEach(entry => {
      if (!entry.activity) return;
      entry.activity.split('/').forEach(a => {
        const s = normalizeSubjectLabel(a.trim());
        if (s) subjects.add(s);
      });
    });
  });
  const sortedSubjects = Array.from(subjects).sort();

  const subject = normalizeSubjectLabel(agendaSubject);
  // Lagres som «Engelsk 8.», men vises med trinnet foran: «8. Engelsk»
  const subjectText = subject ? formatExpandedActivityLabel(subject) : '';
  const items = subject ? (currentClass.agendas?.[subject] || []) : [];
  const hasTemplate = subject && currentClass.templates?.[subject]?.length > 0;

  // Compute subject color
  const subjectColor = subject
    ? ((currentClass.subjectColors?.[subject]) || getSubjectDefaultColor(subject))
    : null;
  // Fagfargen er båndet øverst og kanten på hvert gjøremål; selve panelet er instrument
  const hasColor = subjectColor && subjectColor.toLowerCase() !== '#ffffff';
  const panelStyle = hasColor ? {
    '--fag': subjectColor,
    '--fag-tekst': getReadableAgendaTextColor(subjectColor) === '#5F5F5F' ? '#1C2735' : '#F8FBFF',
  } : {};

  function handleDragStart(e, idx) {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIdx, 1);
    newItems.splice(idx, 0, removed);
    setDraggedIdx(idx);
    onReorder(subject, newItems);
  }

  function handleDragEnd() {
    setDraggedIdx(null);
  }

  return (
    <div
      className={`k-panel agenda-sidebar${open ? ' active' : ''}`}
      id="agenda-sidebar"
      ref={sidebarRef}
      style={panelStyle}
      role="dialog"
      aria-label="Agenda"
    >
      <div className="k-panel-head" id="agenda-drag-handle" ref={handleRef}>
        <div className="k-panel-titles">
          <div className="k-panel-title">Agenda</div>
          <div className="k-panel-sub" id="agenda-subtitle">
            {subject ? `Gjøremål for ${subjectText}` : 'Velg et fag for å starte'}
          </div>
        </div>
        <button
          type="button"
          className="k-close"
          id="agenda-close-btn"
          aria-label="Lukk agenda"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClose(); setSubjectMenuOpen(false); }}
        ><Ikon navn="x" /></button>
      </div>

      <div className="agenda-header">
        <button
          type="button"
          className="k-btn k-btn--ny k-btn--ikon"
          id="agenda-add-btn"
          aria-label="Legg til gjøremål"
          title={subject ? 'Legg til gjøremål' : 'Velg et fag først'}
          disabled={!subject || !editPermission}
          onClick={() => { if (subject) onAddItem(subject); }}
        ><Ikon navn="plus" /></button>
        <button
          type="button"
          className={`agenda-subject-btn${subject ? ' is-selected' : ''}`}
          id="agenda-subject-btn"
          aria-haspopup="listbox"
          aria-expanded={subjectMenuOpen ? 'true' : 'false'}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setSubjectMenuOpen(v => !v); }}
        >{subjectText || 'Fag'}</button>
        <select id="agenda-subject-select" hidden value={subject} onChange={() => {}}>
          <option value="">Velg fag...</option>
        </select>
        <div
          className={`agenda-subject-menu${subjectMenuOpen ? ' active' : ''}`}
          id="agenda-subject-menu"
          role="listbox"
          aria-label="Velg fag"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {sortedSubjects.length === 0 ? (
            <div className="agenda-subject-empty">Ingen fag</div>
          ) : (
            sortedSubjects.map(s => (
              <button
                key={s}
                type="button"
                className={`agenda-subject-option${s === subject ? ' active' : ''}`}
                role="option"
                aria-selected={s === subject ? 'true' : 'false'}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  onSetSubject(s);
                  setSubjectMenuOpen(false);
                }}
              >{formatExpandedActivityLabel(s)}</button>
            ))
          )}
        </div>
      </div>

      <div className="agenda-items" id="agenda-items">
        {!subject && (
          <div className="agenda-empty-state">Velg et fag over for å vise eller legge til gjøremål.</div>
        )}
        {subject && items.length === 0 && (
          <div className="agenda-empty-state">
            {editPermission ? `Ingen gjøremål for ${subjectText} enda. Trykk + for å legge til.` : `Ingen gjøremål for ${subjectText} enda.`}
          </div>
        )}
        {subject && items.map((item, index) => (
          <div
            key={index}
            className={`agenda-item${item.completed ? ' completed' : ''}${draggedIdx === index ? ' dragging' : ''}`}
            draggable={editPermission}
            data-index={index}
            onDragStart={e => handleDragStart(e, index)}
            onDragOver={e => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span
              className="agenda-item-emoji"
              onClick={e => { e.stopPropagation(); if (editPermission) onEditItem(subject, item, index); }}
            ><FagSymbol verdi={item.emoji} reserve="clipboard-list" /></span>
            <span
              className="agenda-item-text"
              onClick={e => { e.stopPropagation(); if (editPermission) onEditItem(subject, item, index); }}
            >{item.name}</span>
            <div className="agenda-item-side">
              <span
                className="agenda-item-duration"
                onClick={e => { e.stopPropagation(); if (editPermission) onEditItem(subject, item, index); }}
              >{item.duration || 0}m</span>
              <div className="agenda-item-actions">
                <button
                  type="button"
                  className="agenda-item-check"
                  aria-label={`Marker gjøremål som ${item.completed ? 'ikke gjennomført' : 'gjennomført'}`}
                  aria-pressed={item.completed ? 'true' : 'false'}
                  draggable={false}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onToggleItem(subject, index); }}
                ><Ikon navn="check" /></button>
                <button
                  type="button"
                  className={`agenda-item-delete${editPermission ? '' : ' is-disabled'}`}
                  aria-label="Slett gjøremål"
                  disabled={!editPermission}
                  draggable={false}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    if (!editPermission) return;
                    if (confirm('Slette denne aktiviteten?')) onDeleteItem(subject, index);
                  }}
                ><Ikon navn="trash-2" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subject && (
        <div id="agenda-footer" className="agenda-footer">
          <button
            type="button"
            className="k-btn k-btn--ny k-btn--liten"
            title="Husk denne lista som mal for faget"
            disabled={!editPermission || items.length === 0}
            onClick={() => { onSaveTemplate(subject); alert(`Agendaen er lagret som mal for ${subjectText}.`); }}
          >Lagre som mal</button>
          {hasTemplate && (
            <button
              type="button"
              id="agenda-load-template-btn"
              className="k-btn k-btn--rediger k-btn--liten"
              title="Hent inn malen for faget"
              disabled={!editPermission}
              onClick={() => onLoadTemplate(subject)}
            >Hent mal</button>
          )}
          <button
            type="button"
            className="k-btn k-btn--slett k-btn--liten"
            style={{ marginLeft: 'auto' }}
            disabled={!editPermission || items.length === 0}
            onClick={() => { if (confirm(`Tømme hele agendaen for ${subjectText}?`)) onClearAgenda(subject); }}
          >Tøm alt</button>
        </div>
      )}
    </div>
  );
}
