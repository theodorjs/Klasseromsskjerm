import { useState, useEffect, useRef } from 'react';
import Dialog from './Dialog.jsx';
import Info from './Info.jsx';
import { normalizeCountdownTimeEntry, isValidCountdownTime } from '../utils/schedule.js';

/* Hver dialog monteres bare mens den er åpen (se wrapper-funksjonene nederst):
   da kan starttilstanden komme rett fra props, uten reset-effekter.
   Alle småvinduene bruker samme Dialog og de samme knappene: grønn fylt knapp
   for det ene du mest sannsynlig vil gjøre, blå for å gå tilbake, rød for å
   slette. Emoji velges i et rutenett inne i dialogen, aldri i et løst vindu. */

function EmojiVelger({ emojis, value, onPick, open, onToggle, id }) {
  return (
    <div className="k-field">
      <span>Emoji</span>
      <div className="k-emoji-row">
        <span className="k-emoji-preview" aria-hidden="true">{value || '·'}</span>
        <button
          type="button"
          id={id}
          className="k-btn k-btn--hjelp k-btn--liten"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? 'Skjul emoji' : 'Velg emoji'}
        </button>
      </div>
      {open && (
        <div className="k-emoji-grid" role="listbox" aria-label="Emoji">
          {emojis.map(em => (
            <button
              key={em}
              type="button"
              role="option"
              aria-selected={em === value}
              className={`k-emoji${em === value ? ' is-active' : ''}`}
              onClick={() => onPick(em)}
            >{em}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Endre én økt midlertidig (fra tidslinjen) ───────────────────────────────
function EditModalInner({ displayActivity, hasTempActivity, onSave, onReset, onCancel }) {
  const [value, setValue] = useState(displayActivity || '');
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  const save = () => { if (value.trim()) onSave(value.trim()); };

  return (
    <Dialog onClose={onCancel} title="Endre denne økta" className="k-dialog--edit" >
      <Info>Gjelder bare på denne skjermen, og bare til nettleseren lukkes. Timeplanen endres ikke.</Info>
      <label className="k-field">
        <span>Hva skjer i denne økta?</span>
        <input
          type="text"
          id="edit-activity-input"
          className="k-input k-input--stor"
          placeholder="For eksempel «Prøve» eller «Tur»"
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
        />
      </label>
      <div className="k-dialog-actions">
        <button type="button" id="save-activity" className="k-btn k-btn--rediger k-btn--fylt" onClick={save}>Bruk</button>
        <button type="button" id="cancel-edit" className="k-btn k-btn--tilbake" onClick={onCancel}>Avbryt</button>
        {hasTempActivity && (
          <button type="button" id="reset-activity" className="k-btn k-btn--slett" onClick={onReset}>Tilbakestill</button>
        )}
      </div>
    </Dialog>
  );
}

// ─── Gjøremål i agendaen ─────────────────────────────────────────────────────
const EMOJIS = [
  "📚","📖","📝","✏️","🧠","🏫","👩‍🏫","👨‍🏫","🎒","📓",
  "📐","📏","🔢","➗","🧮","🔬","🧪","🧬","🌍","🗺️",
  "🎨","🖌️","🎭","🎶","🎵","💻","⌨️","🖥️","📊","📌",
  "✅","📋","🗂️","🗣️","🇳🇴","🇬🇧","📣","🤝","👥","🧩",
  "🧘","🏃‍♂️","🏃‍♀️","⚽","🥪","🍎","🥛","☕","💼","🛠️"
];

function ActivityModalInner({ item, itemIndex, subject, onSave, onCancel }) {
  const [name, setName] = useState(item?.name || '');
  const [emoji, setEmoji] = useState(item?.emoji || '');
  const [duration, setDuration] = useState(item?.duration || '');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select(); }, 50);
    return () => clearTimeout(id);
  }, []);

  function handleSave() {
    if (name.trim() && subject) {
      onSave({ name: name.trim(), emoji, duration, completed: false }, itemIndex);
    }
  }

  return (
    <Dialog onClose={onCancel} title={item ? 'Rediger gjøremål' : 'Nytt gjøremål'}>
      {subject && <Info>Legges i agendaen for {subject}. Elevene ser den på skjermen når agendaen er åpen.</Info>}
      <label className="k-field">
        <span>Navn</span>
        <input
          type="text"
          id="activity-name-input"
          className="k-input"
          placeholder="For eksempel «Intro» eller «Oppgave 3»"
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
        />
      </label>
      <div className="k-field-row">
        <label className="k-field" style={{ flex: '0 0 150px' }}>
          <span>Varighet (minutter)</span>
          <input
            type="number"
            id="activity-duration-input"
            className="k-input"
            inputMode="numeric"
            min="0"
            placeholder="10"
            value={duration}
            onChange={e => setDuration(e.target.value)}
          />
        </label>
      </div>
      <EmojiVelger
        id="activity-emoji-input"
        emojis={EMOJIS}
        value={emoji}
        open={emojiPickerOpen}
        onToggle={() => setEmojiPickerOpen(v => !v)}
        onPick={em => { setEmoji(em); setEmojiPickerOpen(false); }}
      />
      <div className="k-dialog-actions">
        <button type="button" id="activity-save" className="k-btn k-btn--ny k-btn--fylt" onClick={handleSave} disabled={!name.trim()}>Lagre</button>
        <button type="button" id="activity-cancel" className="k-btn k-btn--tilbake" onClick={onCancel}>Avbryt</button>
      </div>
    </Dialog>
  );
}

// ─── Nedtelling til en dato ──────────────────────────────────────────────────
function CountdownModalInner({ editingIndex, existingItem, onSave, onDelete, onCancel }) {
  const [title, setTitle] = useState(existingItem?.title || '');
  const [targetDate, setTargetDate] = useState(existingItem?.targetDate || '');
  const [targetTime, setTargetTime] = useState(existingItem?.targetTime || '');
  const titleRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => { titleRef.current?.focus(); titleRef.current?.select(); }, 50);
    return () => clearTimeout(id);
  }, []);

  const normalizedTime = normalizeCountdownTimeEntry(targetTime);
  const canSave = !!title.trim() && !!targetDate && isValidCountdownTime(normalizedTime);

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: existingItem?.id || `countdown-${Date.now()}`,
      title: title.trim(),
      targetDate,
      targetTime: normalizedTime,
    }, editingIndex);
  }

  return (
    <Dialog onClose={onCancel} title={existingItem ? 'Rediger nedtelling' : 'Ny nedtelling'}>
      <Info>Vises på hovedskjermen som «X dager til …». Hver klasse kan ha inntil tre.</Info>
      <label className="k-field">
        <span>Hva telles det ned til?</span>
        <input
          type="text"
          id="countdown-title-input"
          className="k-input"
          placeholder="For eksempel «Juleferie» eller «Leirskole»"
          ref={titleRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          required
        />
      </label>
      <div className="k-field-row">
        <label className="k-field">
          <span>Dato</span>
          <input
            type="date"
            id="countdown-date-input"
            className="k-input"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            required
          />
        </label>
        <label className="k-field" style={{ flex: '0 0 120px' }}>
          <span>Klokkeslett</span>
          <input
            type="text"
            id="countdown-time-input"
            className="k-input"
            placeholder="08:30"
            inputMode="numeric"
            maxLength={5}
            pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
            title="Bruk 24-timersformat, for eksempel 08:30"
            value={targetTime}
            onChange={e => setTargetTime(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="k-dialog-actions">
        <button type="button" id="countdown-save" className="k-btn k-btn--ny k-btn--fylt" onClick={handleSave} disabled={!canSave}>Lagre</button>
        <button type="button" id="countdown-cancel" className="k-btn k-btn--tilbake" onClick={onCancel}>Avbryt</button>
        {existingItem && (
          <button type="button" id="countdown-delete" className="k-btn k-btn--slett" onClick={() => onDelete(editingIndex)}>Slett</button>
        )}
      </div>
    </Dialog>
  );
}

// ─── Lærer-innlogging ────────────────────────────────────────────────────────
const TEACHER_PASSWORD = "tilfeldigpassord";

function LoginModalInner({ onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

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
    <Dialog onClose={onCancel} title="Lås opp for læreren">
      <Info>Passordet låser opp redigering av timeplan, agenda og nedtellinger på denne skjermen.</Info>
      <label className="k-field">
        <span>Passord</span>
        <input
          type="password"
          id="login-password-input"
          className="k-input k-input--stor"
          placeholder="Passord"
          autoComplete="current-password"
          ref={inputRef}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
          aria-invalid={error || undefined}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </label>
      {error && <p id="login-error" className="k-feil" role="alert">Feil passord. Prøv igjen.</p>}
      <div className="k-dialog-actions">
        <button type="button" id="login-submit" className="k-btn k-btn--ny k-btn--fylt" onClick={handleLogin}>Lås opp</button>
        <button type="button" id="login-cancel" className="k-btn k-btn--tilbake" onClick={onCancel}>Avbryt</button>
      </div>
    </Dialog>
  );
}

// ─── Farge og emoji for et fag ───────────────────────────────────────────────
const SUBJECT_EMOJIS = ["📖","🔢","🧬","🌍","🎨","🌮","🏃‍♂️","🎶","✝️","🇳🇴","🇬🇧","🧘","🥪","🍎","⏸️","🎭","🧩","💻","🎬","🌟","🪐","🧠","🚀","🛰️"];

function ColorDetailModalInner({ subject, currentColor, currentEmoji, onSave, onCancel }) {
  const [color, setColor] = useState(currentColor || '#ffffff');
  const [hexValue, setHexValue] = useState((currentColor || '#ffffff').toUpperCase());
  const [emoji, setEmoji] = useState(currentEmoji || '🎨');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleColorChange(val) {
    setColor(val);
    setHexValue(val.toUpperCase());
  }

  function handleHexChange(val) {
    let v = val;
    if (v && !v.startsWith('#')) v = '#' + v;
    setHexValue(val);
    if (/^#[0-9A-F]{6}$/i.test(v)) setColor(v.toUpperCase());
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hexValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <Dialog onClose={onCancel} title={`Farge for ${subject}`}>
      <div id="color-preview-large" className="k-color-preview" style={{ backgroundColor: color }} aria-hidden="true" />
      <div className="k-field">
        <span>Farge</span>
        <div className="k-color-row">
          <input
            type="color"
            id="subject-color-input"
            className="k-color-input"
            aria-label="Velg farge"
            value={color.startsWith('#') ? color : '#ffffff'}
            onChange={e => handleColorChange(e.target.value)}
          />
          <input
            type="text"
            id="subject-hex-input"
            className="k-input k-input--mono"
            aria-label="Fargekode"
            placeholder="#FFFFFF"
            value={hexValue}
            onChange={e => handleHexChange(e.target.value)}
          />
        </div>
        <div className="k-chips">
          <button type="button" id="subject-color-copy" className="k-btn k-btn--hjelp k-btn--liten" onClick={handleCopy}>
            {copied ? '✓ Kopiert' : '📋 Kopier koden'}
          </button>
          <button type="button" id="subject-color-paste" className="k-btn k-btn--hjelp k-btn--liten" onClick={handlePaste}>
            Lim inn kode
          </button>
        </div>
      </div>
      <EmojiVelger
        id="subject-emoji-btn"
        emojis={SUBJECT_EMOJIS}
        value={emoji}
        open={emojiPickerOpen}
        onToggle={() => setEmojiPickerOpen(v => !v)}
        onPick={em => { setEmoji(em); setEmojiPickerOpen(false); }}
      />
      <Info>Fargen brukes på tidslinjen, hovedskjermen og nedtellingsskiva. Velg en som skiller seg fra de andre fagene.</Info>
      <div className="k-dialog-actions">
        <button type="button" id="subject-color-save" className="k-btn k-btn--ny k-btn--fylt" onClick={() => onSave(subject, color, emoji)}>Lagre</button>
        <button type="button" id="subject-color-cancel" className="k-btn k-btn--tilbake" onClick={onCancel}>Avbryt</button>
      </div>
    </Dialog>
  );
}

export function EditModal(props) {
  return props.open ? <EditModalInner {...props} /> : null;
}

export function ActivityModal(props) {
  return props.open ? <ActivityModalInner {...props} /> : null;
}

export function CountdownModal(props) {
  return props.open ? <CountdownModalInner {...props} /> : null;
}

export function LoginModal(props) {
  return props.open ? <LoginModalInner {...props} /> : null;
}

export function ColorDetailModal(props) {
  return props.open ? <ColorDetailModalInner {...props} /> : null;
}
