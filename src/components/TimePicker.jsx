import { useState } from 'react';
import Dialog from './Dialog.jsx';
import Info from './Info.jsx';

const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
const HOURS = ['08','09','10','11','12','13','14','15'];
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

/** Lar læreren se skjermen slik den ser ut på en annen dag og et annet klokkeslett. */
export default function TimePicker({ open, onApply, onClose }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');

  return (
    <Dialog open={open} onClose={onClose} title="Velg tid" className="tid-dialog">
      <Info>
        Viser skjermen slik den ser ut på valgt dag og klokkeslett, for eksempel for å sjekke timeplanen.
        Klokka øverst får en «Tilbakestill»-knapp som tar deg tilbake til nå.
      </Info>
      <div className="k-field">
        <span>Dag</span>
        <div className="k-chips" role="radiogroup" aria-label="Dag">
          <button
            type="button"
            role="radio"
            aria-checked={selectedDay === null}
            className={`k-chip${selectedDay === null ? ' is-active' : ''}`}
            onClick={() => setSelectedDay(null)}
          >I dag</button>
          {DAYS.map(day => (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={selectedDay === day}
              className={`k-chip${selectedDay === day ? ' is-active' : ''}`}
              data-day={day}
              onClick={() => setSelectedDay(day)}
            >{day}</button>
          ))}
        </div>
      </div>
      <div className="tid-rad">
        <label className="k-field">
          <span>Time</span>
          <select id="hour-select" className="k-select" value={selectedHour} onChange={e => setSelectedHour(e.target.value)}>
            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label className="k-field">
          <span>Minutt</span>
          <select id="minute-select" className="k-select" value={selectedMinute} onChange={e => setSelectedMinute(e.target.value)}>
            {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <div className="k-dialog-actions">
        <button type="button" id="apply-time-btn" className="k-btn k-btn--rediger k-btn--fylt" onClick={() => onApply(selectedDay, selectedHour, selectedMinute)}>
          Vis {selectedDay ? selectedDay.toLowerCase() : 'i dag'} kl. {selectedHour}:{selectedMinute}
        </button>
        <button type="button" id="time-picker-close-btn" className="k-btn k-btn--tilbake" onClick={onClose}>Avbryt</button>
      </div>
    </Dialog>
  );
}
