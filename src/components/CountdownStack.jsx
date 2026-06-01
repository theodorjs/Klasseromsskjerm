import { getCountdownRemainingDisplay } from '../utils/schedule.js';

export default function CountdownStack({ countdowns, countdownsVisible, onEditCountdown }) {
  const shouldShow = countdowns.length > 0 && countdownsVisible !== false;

  return (
    <div className={`countdown-stack${shouldShow ? ' active' : ''}`} aria-live="polite">
      {shouldShow && countdowns.map((item, index) => {
        const display = getCountdownRemainingDisplay(item.targetDate, item.targetTime);
        return (
          <button
            key={item.id || index}
            type="button"
            className="countdown-card"
            onClick={() => onEditCountdown(index)}
          >
            <span className="countdown-card-title">{item.title}</span>
            <span className="countdown-card-number">{display.value}</span>
            <span className="countdown-card-unit">{display.unit}</span>
          </button>
        );
      })}
    </div>
  );
}
