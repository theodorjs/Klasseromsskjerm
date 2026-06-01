import { useState, useEffect, useRef, useCallback } from 'react';
import { computeTimerGradientColors, normalizeHexColor, TIMER_GRADIENT_DEFAULT } from '../utils/color.js';

const TIMER_GRADIENT_KEY = 'timerGradientBaseColor';
const CIRCUMFERENCE = 2 * Math.PI * 111.5;

export default function TimerPanel({ open, onClose }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [gradientColor, setGradientColor] = useState(() => {
    const saved = localStorage.getItem(TIMER_GRADIENT_KEY);
    return normalizeHexColor(saved) || TIMER_GRADIENT_DEFAULT;
  });
  const [gradientControlOpen, setGradientControlOpen] = useState(false);

  const timerEndAtRef = useRef(0);
  const animFrameRef = useRef(null);
  const isPausedRef = useRef(false);

  const { baseColor, partnerColor } = computeTimerGradientColors(gradientColor);
  const progress = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 1;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const dispHours = Math.floor(totalSeconds / 3600);
  const dispMinutes = Math.floor((totalSeconds % 3600) / 60);
  const dispSeconds = totalSeconds % 60;

  function stopAnimation() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }

  const runAnimation = useCallback(() => {
    if (!isRunning) return;
    const now = performance.now();
    const remaining = Math.max(0, timerEndAtRef.current - now);
    setRemainingMs(remaining);
    if (remaining <= 0) {
      stopAnimation();
      setIsRunning(false);
      isPausedRef.current = false;
      setRemainingMs(0);
      setTotalMs(0);
      return;
    }
    animFrameRef.current = requestAnimationFrame(runAnimation);
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) {
      animFrameRef.current = requestAnimationFrame(runAnimation);
    }
    return stopAnimation;
  }, [isRunning, runAnimation]);

  function startOrPause() {
    if (isRunning) {
      const remaining = Math.max(0, timerEndAtRef.current - performance.now());
      stopAnimation();
      setIsRunning(false);
      isPausedRef.current = true;
      setRemainingMs(remaining);
      return;
    }

    let rem = remainingMs;
    if (rem <= 0) {
      const total = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
      if (total <= 0) return;
      rem = total;
      setTotalMs(total);
      setRemainingMs(rem);
    }

    timerEndAtRef.current = performance.now() + rem;
    setIsRunning(true);
    isPausedRef.current = false;
  }

  function resetTimer() {
    stopAnimation();
    setIsRunning(false);
    isPausedRef.current = false;
    setRemainingMs(0);
    setTotalMs(0);
  }

  function clampValue(val, min, max) {
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function handleGradientChange(color) {
    const normalized = normalizeHexColor(color) || TIMER_GRADIENT_DEFAULT;
    setGradientColor(normalized);
    localStorage.setItem(TIMER_GRADIENT_KEY, normalized);
  }

  let centerClass = '';
  if (dispHours > 0) centerClass = 'layout-hour-min-sec';
  else if (totalSeconds >= 60) centerClass = 'layout-min-sec';
  else centerClass = 'layout-sec-only';

  return (
    <div className={`timer-panel${open ? ' active' : ''}`} id="timer-panel">
      <div className="timer-card">
        <div className="timer-close" id="timer-close-btn" onClick={onClose}>✕</div>
        <div className="timer-ring" onClick={(e) => {
          e.stopPropagation();
          setGradientControlOpen(v => !v);
        }}>
          <svg viewBox="0 0 246 246">
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop id="timer-gradient-start" offset="0%" stopColor={baseColor} />
                <stop id="timer-gradient-mid" offset="52%" stopColor={partnerColor} />
                <stop id="timer-gradient-end" offset="100%" stopColor={baseColor} />
              </linearGradient>
            </defs>
            <circle className="circle-bg" cx="123" cy="123" r="111.5"></circle>
            <circle
              className="circle-fill"
              cx="123" cy="123" r="111.5"
              style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: dashOffset }}
            ></circle>
          </svg>
          <div className={`timer-center ${centerClass}`}>
            <div id="timer-hour-readout" className="timer-center-line timer-center-hour">
              {String(dispHours).padStart(2, '0')}
            </div>
            <div id="timer-min-readout" className="timer-center-line">
              {String(dispHours > 0 ? dispMinutes : (totalSeconds >= 60 ? Math.floor(totalSeconds / 60) : dispMinutes)).padStart(2, '0')}
            </div>
            <div id="timer-sec-readout" className="timer-center-sub">
              {String(dispSeconds).padStart(2, '0')}
            </div>
          </div>
        </div>

        <div
          className={`timer-gradient-control${gradientControlOpen ? ' active' : ''}`}
          id="timer-gradient-control"
          aria-hidden={gradientControlOpen ? 'false' : 'true'}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <input
            type="color"
            id="timer-gradient-picker"
            value={gradientColor}
            aria-label="Velg timer-farge"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onChange={e => handleGradientChange(e.target.value)}
          />
        </div>

        <div className="timer-input-vertical">
          <div className="inputGroup time-unit">
            <label className="time-unit-label" htmlFor="timer-hours">Timer</label>
            <div className="time-unit-row">
              <div className="time-unit-field" data-unit="Timer">
                <input
                  type="number" id="timer-hours" min="0" max="99" inputMode="numeric"
                  value={isRunning ? '' : hours}
                  disabled={isRunning}
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => setHours(clampValue(e.target.value, 0, 99))}
                  onBlur={e => { if (e.target.value === '') setHours(0); }}
                />
              </div>
              <div className="time-spin" aria-hidden="false">
                <button type="button" className="time-spin-btn" onClick={e => { e.stopPropagation(); if (!isRunning) setHours(h => Math.min(99, h + 1)); }} onMouseDown={e => e.stopPropagation()} aria-label="Øk timer"><span className="time-spin-chevron up"></span></button>
                <button type="button" className="time-spin-btn" onClick={e => { e.stopPropagation(); if (!isRunning) setHours(h => Math.max(0, h - 1)); }} onMouseDown={e => e.stopPropagation()} aria-label="Reduser timer"><span className="time-spin-chevron down"></span></button>
              </div>
            </div>
          </div>
          <div className="inputGroup time-unit">
            <label className="time-unit-label" htmlFor="timer-minutes">Minutter</label>
            <div className="time-unit-row">
              <div className="time-unit-field" data-unit="Minutter">
                <input
                  type="number" id="timer-minutes" min="0" max="59" inputMode="numeric"
                  value={isRunning ? '' : minutes}
                  disabled={isRunning}
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => setMinutes(clampValue(e.target.value, 0, 59))}
                  onBlur={e => { if (e.target.value === '') setMinutes(0); }}
                />
              </div>
              <div className="time-spin" aria-hidden="false">
                <button type="button" className="time-spin-btn" onClick={e => { e.stopPropagation(); if (!isRunning) setMinutes(m => Math.min(59, m + 1)); }} onMouseDown={e => e.stopPropagation()} aria-label="Øk minutter"><span className="time-spin-chevron up"></span></button>
                <button type="button" className="time-spin-btn" onClick={e => { e.stopPropagation(); if (!isRunning) setMinutes(m => Math.max(0, m - 1)); }} onMouseDown={e => e.stopPropagation()} aria-label="Reduser minutter"><span className="time-spin-chevron down"></span></button>
              </div>
            </div>
          </div>
          <div className="inputGroup time-unit">
            <label className="time-unit-label" htmlFor="timer-seconds">Sekunder</label>
            <div className="time-unit-row">
              <div className="time-unit-field" data-unit="Sekunder">
                <input
                  type="number" id="timer-seconds" min="0" max="59" inputMode="numeric"
                  value={isRunning ? '' : seconds}
                  disabled={isRunning}
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => setSeconds(clampValue(e.target.value, 0, 59))}
                  onBlur={e => { if (e.target.value === '') setSeconds(0); }}
                />
              </div>
              <div className="time-spin" aria-hidden="false">
                <button type="button" className="time-spin-btn" onClick={e => { e.stopPropagation(); if (!isRunning) setSeconds(s => Math.min(59, s + 1)); }} onMouseDown={e => e.stopPropagation()} aria-label="Øk sekunder"><span className="time-spin-chevron up"></span></button>
                <button type="button" className="time-spin-btn" onClick={e => { e.stopPropagation(); if (!isRunning) setSeconds(s => Math.max(0, s - 1)); }} onMouseDown={e => e.stopPropagation()} aria-label="Reduser sekunder"><span className="time-spin-chevron down"></span></button>
              </div>
            </div>
          </div>
        </div>

        <div className="timer-buttons">
          <button
            className={`timer-control timer-toggle${isRunning ? ' running' : ''}`}
            id="timer-start"
            aria-label="Start eller pause timer"
            onClick={startOrPause}
          >
            <svg className="timer-icon timer-icon-play" viewBox="0 0 24 24" aria-hidden="true" style={{ display: isRunning ? 'none' : 'block' }}>
              <path d="M8 5v14l11-7z"></path>
            </svg>
            <svg className="timer-icon timer-icon-pause" viewBox="0 0 24 24" aria-hidden="true" style={{ display: isRunning ? 'block' : 'none' }}>
              <path d="M7 5h4v14H7zM13 5h4v14h-4z"></path>
            </svg>
          </button>
          <button
            className="timer-control timer-stop"
            id="timer-reset"
            aria-label="Stopp og nullstill timer"
            onClick={resetTimer}
          >
            <svg className="timer-icon timer-icon-stop" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10v10H7z"></path>
            </svg>
          </button>
        </div>
        <div id="timer-display" style={{ display: 'none' }}>
          {String(dispHours).padStart(2, '0')}:{String(dispMinutes).padStart(2, '0')}:{String(dispSeconds).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
