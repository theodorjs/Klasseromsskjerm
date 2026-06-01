import { getIsoWeekNumberForOslo } from '../utils/time.js';

export default function StatusBar({ currentDay, currentHour, currentMinute, dateStr, isSim, onResetSim }) {
  const weekNum = getIsoWeekNumberForOslo(new Date());

  return (
    <div className="top-status-bar">
      <div className="week-number" aria-live="polite">Uke {weekNum}</div>
      <div className="date-time">
        <span id="day-display" data-changed={isSim ? "true" : "false"}>{currentDay}</span>
        <span id="date-display">{dateStr}</span>
        <span id="hour-display" data-changed={isSim ? "true" : "false"}>{String(currentHour).padStart(2, '0')}</span>
        :<span id="minute-display" data-changed={isSim ? "true" : "false"}>{String(currentMinute).padStart(2, '0')}</span>
        {isSim && (
          <>
            <span className="sim-indicator" style={{ display: 'inline-flex' }}>
              {currentDay} {String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')} (simulert)
            </span>
            <button className="sim-reset-btn" style={{ display: 'inline-flex' }} onClick={onResetSim}>
              Tilbakestill
            </button>
          </>
        )}
      </div>
    </div>
  );
}
