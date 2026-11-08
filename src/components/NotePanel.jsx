import { useEffect, useRef } from 'react';
import { safeGetItem, safeSetItem, sanitizeNoteHtml } from '../utils/storage.js';

const NOTE_STORAGE_KEY = 'classroomNoteHtml';

function makeDraggablePanel(el, handle) {
  if (!el || !handle) return () => {};
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  function dragMouseDown(e) {
    const interactive = e.target.closest('input, button, select, textarea, label, [contenteditable]');
    if (interactive) return;
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
    pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
    pos3 = e.clientX; pos4 = e.clientY;
    el.style.top = (el.offsetTop - pos2) + "px";
    el.style.left = (el.offsetLeft - pos1) + "px";
    el.style.right = 'auto';
  }
  function closeDrag() { document.onmouseup = null; document.onmousemove = null; }
  handle.onmousedown = dragMouseDown;
  return () => { handle.onmousedown = null; };
}

/** Notat til klassen: stor tekst på et instrumentpanel som kan dras rundt og endres i størrelse. */
export default function NotePanel({ open, onClose }) {
  const panelRef = useRef(null);
  const handleRef = useRef(null);
  const editorRef = useRef(null);
  const selectionRef = useRef(null);

  useEffect(() => {
    if (panelRef.current && handleRef.current) {
      return makeDraggablePanel(panelRef.current, handleRef.current);
    }
  }, [open]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = sanitizeNoteHtml(safeGetItem(NOTE_STORAGE_KEY) || '');
    }
  }, []);

  useEffect(() => {
    if (open && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        selectionRef.current = range.cloneRange();
      }
    }
  }, [open]);

  function saveNote() {
    if (editorRef.current) {
      safeSetItem(NOTE_STORAGE_KEY, editorRef.current.innerHTML);
    }
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }

  function restoreSelection() {
    if (!selectionRef.current) return false;
    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
    return true;
  }

  function execFormat(command) {
    const restored = restoreSelection();
    if (!restored && editorRef.current) editorRef.current.focus();
    saveSelection();
    document.execCommand(command, false);
    saveSelection();
    saveNote();
  }

  function handleKeyDown(e) {
    const isModifier = e.metaKey || e.ctrlKey;
    if (!isModifier || e.altKey) return;
    const map = { b: 'bold', i: 'italic', u: 'underline' };
    const command = map[e.key.toLowerCase()];
    if (!command) return;
    e.preventDefault();
    saveSelection();
    document.execCommand(command, false);
    saveSelection();
    saveNote();
  }

  const formatBtn = (command, label, children) => (
    <button
      type="button"
      className="note-toolbar-btn"
      data-command={command}
      aria-label={label}
      title={label}
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
      onClick={e => { e.preventDefault(); e.stopPropagation(); execFormat(command); }}
    >{children}</button>
  );

  return (
    <div className={`k-panel note-panel${open ? ' active' : ''}`} id="note-panel" ref={panelRef} role="dialog" aria-label="Notat">
      <div className="k-panel-head" id="note-drag-handle" ref={handleRef}>
        <div className="k-panel-titles">
          <div className="k-panel-title">Notat</div>
        </div>
        <div className="note-toolbar" id="note-toolbar" role="toolbar" aria-label="Formatering">
          {formatBtn('bold', 'Fet skrift', <strong>B</strong>)}
          {formatBtn('italic', 'Kursiv', <em>I</em>)}
          {formatBtn('underline', 'Understrek', <u>U</u>)}
        </div>
        <button
          type="button"
          className="k-close"
          id="note-close-btn"
          aria-label="Lukk notat"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onClose(); }}
        >✕</button>
      </div>
      <div
        className="note-editor"
        id="note-editor"
        contentEditable="true"
        spellCheck={false}
        aria-label="Notat"
        data-placeholder="Skriv her …"
        ref={editorRef}
        onInput={saveNote}
        onBlur={saveNote}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onKeyDown={handleKeyDown}
      ></div>
    </div>
  );
}
