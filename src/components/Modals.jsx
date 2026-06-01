import { useState, useEffect, useRef } from 'react';
import { normalizeSubjectLabel, normalizeCountdownTimeEntry, isValidCountdownTime } from '../utils/schedule.js';
import { normalizeHexColor } from '../utils/color.js';

// ─── Edit Activity Modal ─────────────────────────────────────────────────────
export function EditModal({ open, displayActivity, hasTempActivity, onSave, onReset, onCancel }) {
  const [value, setValue] = useState(displayActivity || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue(displayActivity || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, displayActivity]);

  return (
    <div className={`edit-modal${open ? ' active' : ''}`} id="edit-modal">
      <input
        type="text"
        id="edit-activity-input"
        placeholder="Nytt aktivitetsnavn"
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(value); if (e.key === 'Escape') onCancel(); }}
      />
      <button id="save-activity" onClick={() => { if (value.trim()) onSave(value.trim()); }}>Lagre</button>
      <button id="reset-activity" style={{ display: hasTempActivity ? 'block' : 'none' }} onClick={onReset}>Tilbakestill</button>
      <button id="cancel-edit" onClick={onCancel}>Avbryt</button>
    </div>
  );
}

// ─── Activity Add/Edit Modal ─────────────────────────────────────────────────
const EMOJIS = [
  "📚","📖","📝","✏️","🧠","🏫","👩‍🏫","👨‍🏫","🎒","📓",
  "📐","📏","🔢","➗","🧮","🔬","🧪","🧬","🌍","🗺️",
  "🎨","🖌️","🎭","🎶","🎵","💻","⌨️","🖥️","📊","📌",
  "✅","📋","🗂️","🗣️","🇳🇴","🇬🇧","📣","🤝","👥","🧩",
  "🧘","🏃‍♂️","🏃‍♀️","⚽","🥪","🍎","🥛","☕","💼","🛠️"
];

export function ActivityModal({ open, item, itemIndex, subject, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [duration, setDuration] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(item?.name || '');
      setEmoji(item?.emoji || '');
      setDuration(item?.duration || '');
      setEmojiPickerOpen(false);
      setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select(); }, 50);
    }
  }, [open, item]);

  function handleSave() {
    if (name.trim() && subject) {
      onSave({ name: name.trim(), emoji, duration, completed: false }, itemIndex);
    }
  }

  return (
    <div className={`edit-modal${open ? ' active' : ''}`} id="activity-modal">
      <h2 id="activity-modal-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>
        {item ? 'Rediger aktivitet' : 'Ny aktivitet'}
      </h2>
      <div className="activity-form-row">
        <label className="activity-form-label" htmlFor="activity-name-input">Navn</label>
        <input
          type="text"
          id="activity-name-input"
          placeholder="Navn (f.eks. Intro)"
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        />
      </div>
      <div className="activity-form-row activity-form-row-compact">
        <label className="activity-form-label" htmlFor="activity-emoji-input">Emoji</label>
        <input
          type="text"
          id="activity-emoji-input"
          placeholder="Velg"
          maxLength={2}
          style={{ width: 84 }}
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          onClick={e => { e.stopPropagation(); setEmojiPickerOpen(v => !v); }}
          readOnly
        />
        {emojiPickerOpen && (
          <div className="emoji-picker" style={{ position: 'fixed', zIndex: 9999 }}>
            {EMOJIS.map(em => (
              <div key={em} className="emoji-btn" onClick={e => { e.stopPropagation(); setEmoji(em); setEmojiPickerOpen(false); }}>{em}</div>
            ))}
          </div>
        )}
      </div>
      <div className="activity-form-row">
        <label className="activity-form-label" htmlFor="activity-duration-input">Varighet</label>
        <input
          type="number"
          id="activity-duration-input"
          placeholder="Varighet (minutter)"
          value={duration}
          onChange={e => setDuration(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button id="activity-save" onClick={handleSave}>Lagre</button>
        <button id="activity-cancel" onClick={onCancel}>Avbryt</button>
      </div>
    </div>
  );
}

// ─── Countdown Modal ─────────────────────────────────────────────────────────
export function CountdownModal({ open, editingIndex, existingItem, onSave, onDelete, onCancel }) {
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const titleRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle(existingItem?.title || '');
      setTargetDate(existingItem?.targetDate || '');
      setTargetTime(existingItem?.targetTime || '');
      setTimeout(() => { titleRef.current?.focus(); titleRef.current?.select(); }, 50);
    }
  }, [open, existingItem]);

  function handleSave() {
    const normalizedTime = normalizeCountdownTimeEntry(targetTime);
    if (!title.trim() || !targetDate || !isValidCountdownTime(normalizedTime)) return;
    const payload = {
      id: existingItem?.id || `countdown-${Date.now()}`,
      title: title.trim(),
      targetDate,
      targetTime: normalizedTime
    };
    onSave(payload, editingIndex);
  }

  return (
    <div className={`edit-modal${open ? ' active' : ''}`} id="countdown-modal">
      <h2 id="countdown-modal-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>
        {existingItem ? 'Rediger nedtelling' : 'Ny nedtelling'}
      </h2>
      <div className="activity-form-row">
        <label className="activity-form-label" htmlFor="countdown-title-input">Tittel</label>
        <input
          type="text"
          id="countdown-title-input"
          placeholder="Tittel"
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="activity-form-row">
        <label className="activity-form-label" htmlFor="countdown-date-input">Dato</label>
        <input
          type="date"
          id="countdown-date-input"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          required
        />
      </div>
      <div className="activity-form-row">
        <label className="activity-form-label" htmlFor="countdown-time-input">Klokkeslett</label>
        <input
          type="text"
          id="countdown-time-input"
          placeholder="08:30"
          inputMode="numeric"
          maxLength={5}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          title="Bruk 24-timersformat, for eksempel 08:30"
          value={targetTime}
          onChange={e => setTargetTime(e.target.value)}
          required
        />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button id="countdown-save" onClick={handleSave}>Lagre</button>
        {existingItem && (
          <button id="countdown-delete" onClick={() => onDelete(editingIndex)}>Slett</button>
        )}
        <button id="countdown-cancel" onClick={onCancel}>Avbryt</button>
      </div>
    </div>
  );
}

// ─── Login Modal ─────────────────────────────────────────────────────────────
const TEACHER_PASSWORD = "tilfeldigpassord";

export function LoginModal({ open, onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleLogin() {
    if (password === TEACHER_PASSWORD) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPassword('');
      inputRef.current?.focus();
    }
  }

  return (
    <div className={`edit-modal${open ? ' active' : ''}`} id="login-modal">
      <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Lærer-innlogging</h2>
      <div className="login-input-container">
        <input
          type="password"
          id="login-password-input"
          placeholder="Passord"
          ref={inputRef}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
        />
      </div>
      {error && <div id="login-error" style={{ color: '#f44336', fontSize: '0.8rem' }}>Feil passord</div>}
      <button id="login-submit" className="neumorphic-btn" onClick={handleLogin}>Logg inn</button>
      <button id="login-cancel" className="neumorphic-btn" onClick={onCancel}>Avbryt</button>
    </div>
  );
}

// ─── Color Detail Modal ───────────────────────────────────────────────────────
const SUBJECT_EMOJIS = ["📖","🔢","🧬","🌍","🎨","🌮","🏃‍♂️","🎶","✝️","🇳🇴","🇬🇧","🧘","🥪","🍎","⏸️","🎭","🧩","💻","🎬","🌟","🪐","🧠","🚀","🛰️"];

export function ColorDetailModal({ open, subject, currentColor, currentEmoji, onSave, onCancel }) {
  const [color, setColor] = useState(currentColor || '#ffffff');
  const [hexValue, setHexValue] = useState((currentColor || '#ffffff').toUpperCase());
  const [emoji, setEmoji] = useState(currentEmoji || '🎨');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const c = currentColor || '#ffffff';
      setColor(c);
      setHexValue(c.toUpperCase());
      setEmoji(currentEmoji || '🎨');
      setEmojiPickerOpen(false);
    }
  }, [open, currentColor, currentEmoji]);

  function handleColorChange(val) {
    setColor(val);
    setHexValue(val.toUpperCase());
  }

  function handleHexChange(val) {
    let v = val;
    if (v && !v.startsWith('#')) v = '#' + v;
    setHexValue(val);
    if (/^#[0-9A-F]{6}$/i.test(v)) {
      setColor(v.toUpperCase());
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      let val = text.trim();
      if (val && !val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        setColor(val.toUpperCase());
        setHexValue(val.toUpperCase());
      }
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  }

  return (
    <div className={`edit-modal${open ? ' active' : ''}`} id="color-detail-modal">
      <h2 id="color-subject-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>
        Farge for: {subject}
      </h2>
      <div
        id="color-preview-large"
        style={{
          width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
          border: '4px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          backgroundColor: color
        }}
      ></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }}>
        <input
          type="color"
          id="subject-color-input"
          value={color.startsWith('#') ? color : '#ffffff'}
          style={{ width: '100%', height: 50, cursor: 'pointer', border: 'none', background: 'none' }}
          onChange={e => handleColorChange(e.target.value)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div id="subject-emoji-preview" style={{ fontSize: '1.4rem', width: 32, textAlign: 'center' }}>{emoji}</div>
            <button
              id="subject-emoji-btn"
              className="neumorphic-btn"
              style={{ padding: '8px 10px', fontSize: '0.85rem' }}
              onClick={e => { e.stopPropagation(); setEmojiPickerOpen(v => !v); }}
            >🙂 Emoji</button>
            {emojiPickerOpen && (
              <div className="emoji-picker subject-emoji-picker" style={{ position: 'fixed', zIndex: 9999 }}>
                {SUBJECT_EMOJIS.map(em => (
                  <div
                    key={em}
                    className="emoji-btn"
                    onClick={e => { e.stopPropagation(); setEmoji(em); setEmojiPickerOpen(false); }}
                  >{em}</div>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            id="subject-hex-input"
            placeholder="#FFFFFF"
            style={{ textAlign: 'center', fontFamily: 'monospace' }}
            value={hexValue}
            onChange={e => handleHexChange(e.target.value)}
          />
          <button
            id="subject-color-copy"
            className="neumorphic-btn"
            style={{ padding: 10, fontSize: '0.8rem' }}
            onClick={() => {
              navigator.clipboard.writeText(hexValue);
            }}
          >📋 Kopier</button>
          <button
            id="subject-color-paste"
            className="neumorphic-btn"
            style={{ padding: 10, fontSize: '0.8rem' }}
            onClick={handlePaste}
          >📋 Lim inn</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 25, justifyContent: 'center' }}>
        <button
          id="subject-color-save"
          className="neumorphic-btn"
          style={{ background: 'var(--accent-color)', color: 'white' }}
          onClick={() => onSave(subject, color, emoji)}
        >Lagre</button>
        <button id="subject-color-cancel" className="neumorphic-btn" onClick={onCancel}>Avbryt</button>
      </div>
    </div>
  );
}
