import { useEffect } from 'react';
import { getCountdownRemainingDisplay } from '../utils/schedule.js';

export default function CountdownStack({ countdowns, countdownsVisible, onEditCountdown }) {
  const shouldShow = countdowns.length > 0 && countdownsVisible !== false;

  // Hovedkortet gir plass til raden med «Dager til» når den vises
  useEffect(() => {
    document.body.classList.toggle('har-dager-til', shouldShow);
    return () => document.body.classList.remove('har-dager-til');
  }, [shouldShow]);

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
            title="Endre eller slett"
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
