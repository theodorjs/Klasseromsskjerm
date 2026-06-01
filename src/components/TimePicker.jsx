import { useState } from 'react';

const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const HOURS = ['08','09','10','11','12','13','14','15'];
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

export default function TimePicker({ open, onApply, onClose }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');

  function handleApply() {
    onApply(selectedDay, selectedHour, selectedMinute);
  }

  if (!open) return null;

  return (
    <div className="time-picker-panel active" id="time-picker-panel" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className="time-picker-close"
        id="time-picker-close-btn"
        aria-label="Lukk velg tid-vindu"
        onClick={e => { e.stopPropagation(); onClose(); }}
      >✕</button>
      <div className="day-list">
        {DAYS.map(day => (
          <button
            key={day}
            className={`day-btn${selectedDay === day ? ' selected' : ''}`}
            data-day={day}
            onClick={e => { e.stopPropagation(); setSelectedDay(day); }}
          >{day}</button>
        ))}
      </div>
      <div className="time-selects">
        <div className="time-row">
          <label htmlFor="hour-select">Time:</label>
          <select
            id="hour-select"
            value={selectedHour}
            onChange={e => setSelectedHour(e.target.value)}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="time-row">
          <label htmlFor="minute-select">Minutt:</label>
          <select
            id="minute-select"
            value={selectedMinute}
            onChange={e => setSelectedMinute(e.target.value)}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button className="apply-time-btn" id="apply-time-btn" onClick={handleApply}>Bruk</button>
      </div>
    </div>
  );
}
