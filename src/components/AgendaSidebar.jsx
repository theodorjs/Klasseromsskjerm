import { useState, useRef, useEffect } from 'react';
import { normalizeSubjectLabel } from '../utils/schedule.js';
import { getReadableAgendaTextColor } from '../utils/color.js';
import { getSubjectDefaultColor } from '../utils/color.js';

function makeDraggablePanel(el, handle) {
  if (!el || !handle) return () => {};
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  function dragMouseDown(e) {
    const interactiveTarget = e.target.closest('input, button, select, textarea, label');
    if (interactiveTarget) return;
    const rect = el.getBoundingClientRect();
    el.style.transform = 'none';
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDrag;
    document.onmousemove = drag;
  }

  function drag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    el.style.top = (el.offsetTop - pos2) + "px";
    el.style.left = (el.offsetLeft - pos1) + "px";
    el.style.right = 'auto';
  }

  function closeDrag() {
    document.onmouseup = null;
    document.onmousemove = null;
  }

  handle.onmousedown = dragMouseDown;
  return () => { handle.onmousedown = null; };
}

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
  const items = subject ? (currentClass.agendas?.[subject] || []) : [];
  const hasTemplate = subject && currentClass.templates?.[subject]?.length > 0;

  // Compute subject color
  const subjectColor = subject
    ? ((currentClass.subjectColors?.[subject]) || getSubjectDefaultColor(subject))
    : null;
  const textColor = subjectColor && subjectColor !== '#ffffff' && subjectColor !== '#FFFFFF'
    ? getReadableAgendaTextColor(subjectColor)
    : null;
  const isDarkText = textColor === '#5F5F5F';

  const panelStyle = subjectColor && subjectColor !== '#ffffff' && subjectColor !== '#FFFFFF' ? {
    '--agenda-panel-color': subjectColor,
    '--agenda-panel-text': textColor,
    '--agenda-card-bg': isDarkText ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.16)',
    '--agenda-chip-bg': isDarkText ? 'rgba(255,255,255,0.54)' : 'rgba(255,255,255,0.18)',
    '--agenda-chip-text': textColor,
    '--agenda-border': isDarkText ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.24)',
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
      className={`agenda-sidebar${open ? ' active' : ''}`}
      id="agenda-sidebar"
      ref={sidebarRef}
      style={panelStyle}
    >
      <div className="agenda-drag-handle" id="agenda-drag-handle" ref={handleRef}>
        <div className="agenda-title-wrap">
          <div className="agenda-title">Agenda</div>
          <div className="agenda-subtitle" id="agenda-subtitle">
            {subject ? `Gjøremål for ${subject}` : 'Velg et fag for å starte'}
          </div>
        </div>
        <button
          type="button"
          className="agenda-close-btn"
          id="agenda-close-btn"
          aria-label="Lukk agenda"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClose(); setSubjectMenuOpen(false); }}
        >✕</button>
      </div>

      <div className="agenda-header">
        <button
          type="button"
          className={`agenda-add-btn${!subject ? ' is-disabled' : ''}`}
          id="agenda-add-btn"
          aria-label="Legg til gjøremål"
          disabled={!subject}
          onClick={() => { if (subject) onAddItem(subject); }}
        >+</button>
        <button
          type="button"
          className={`agenda-subject-btn${subject ? ' is-selected' : ''}`}
          id="agenda-subject-btn"
          aria-haspopup="listbox"
          aria-expanded={subjectMenuOpen ? 'true' : 'false'}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setSubjectMenuOpen(v => !v); }}
        >{subject || 'Fag'}</button>
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
              >{s}</button>
            ))
          )}
        </div>
      </div>

      <div className="agenda-items" id="agenda-items">
        {!subject && (
          <div className="agenda-empty-state">Velg et fag for å vise eller legge til gjøremål.</div>
        )}
        {subject && items.length === 0 && (
          <div className="agenda-empty-state">Ingen gjøremål for {subject} enda.</div>
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
            >{item.emoji || '📋'}</span>
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
                >✓</button>
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
                >🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subject && (
        <div id="agenda-footer" className="agenda-footer" style={{ display: 'flex' }}>
          <button
            type="button"
            className="agenda-footer-btn danger"
            onClick={() => { if (confirm(`Tømme hele agendaen for ${subject}?`)) onClearAgenda(subject); }}
          >Tøm alt</button>
          <button
            type="button"
            className="agenda-footer-btn"
            onClick={() => { onSaveTemplate(subject); alert(`Agenda lagret som mal for ${subject}`); }}
          >Lagre mal</button>
          {hasTemplate && (
            <button
              type="button"
              id="agenda-load-template-btn"
              className="agenda-footer-btn alt"
              onClick={() => onLoadTemplate(subject)}
            >Last mal</button>
          )}
        </div>
      )}
    </div>
  );
}
