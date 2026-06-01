import { useState, useEffect, useRef } from 'react';
import ThemeSwitch from './ThemeSwitch.jsx';

async function toggleFullscreen() {
  const root = document.documentElement;
  try {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else if (root.requestFullscreen) {
      await root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    } else {
      alert('Fullskjerm støttes ikke her. På iPad: legg siden til på Hjem-skjermen og åpne den derfra.');
    }
  } catch (err) {
    console.warn('Kunne ikke endre fullskjerm:', err);
  }
}

export default function Toolbox({
  themeMode,
  onSetTheme,
  onOpenTimer,
  onOpenAgenda,
  onOpenNote,
  onOpenClass,
  editPermission,
  onToggleLock,
  onOpenTimePicker,
  timePickerOpen,
  onCloseTimePicker,
  onApplyTime,
  currentClass,
  onAddCountdown,
  onToggleCountdownVisibility,
}) {
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const countdowns = currentClass?.customCountdowns || [];
  const countdownsVisible = currentClass?.countdownsVisible !== false;

  function resetTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (open) timerRef.current = setTimeout(() => setOpen(false), 10000);
  }

  function closeToolbox() {
    setOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  useEffect(() => {
    if (open) resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open]);

  useEffect(() => {
    function updateFs() {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    }
    document.addEventListener('fullscreenchange', updateFs);
    document.addEventListener('webkitfullscreenchange', updateFs);
    return () => {
      document.removeEventListener('fullscreenchange', updateFs);
      document.removeEventListener('webkitfullscreenchange', updateFs);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleMouseMove(e) {
      if (timePickerOpen) { resetTimer(); return; }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const padding = 200;
      if (
        e.clientX < rect.left - padding || e.clientX > rect.right + padding ||
        e.clientY < rect.top - padding || e.clientY > rect.bottom + padding
      ) {
        closeToolbox();
      } else {
        resetTimer();
      }
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [open, timePickerOpen]);

  return (
    <div className={`toolbox-container${open ? ' active' : ''}`} id="toolbox-container" ref={containerRef}>
      <div
        className={`toolbox-main${open ? ' active' : ''}`}
        id="toolbox-main"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) resetTimer();
        }}
      >🧰</div>

      <button
        className={`toolbox-fullscreen${isFullscreen ? ' is-fullscreen' : ''}`}
        id="tool-fullscreen"
        type="button"
        aria-label={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
        title={isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); toggleFullscreen(); resetTimer(); }}
      >⛶</button>

      <div className="toolbox-items">
        {/* Theme Switch */}
        <div className="toolbox-item theme-switch-tool" id="tool-mode" onClick={e => e.stopPropagation()}>
          <ThemeSwitch themeMode={themeMode} onSetTheme={mode => { onSetTheme(mode); resetTimer(); }} />
          <div className="mode-toggle" id="mode-toggle" aria-hidden="true"></div>
        </div>

        {/* Timer */}
        <div className="toolbox-item" id="tool-timer" onClick={e => {
          e.stopPropagation();
          onOpenTimer();
          resetTimer();
        }}>
          <span className="icon">⏰</span>
          <span className="label">Timer</span>
        </div>

        {/* Countdown */}
        <div className="toolbox-item countdown-tool" id="tool-countdown"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <span className="icon">⏳</span>
          <span className="label">Nedtelling</span>
          <div className="countdown-tool-actions">
            <button
              type="button"
              className={`countdown-tool-btn${countdowns.length >= 3 ? ' is-disabled' : ''}`}
              id="countdown-add-btn"
              aria-label="Opprett ny nedtelling"
              title={countdowns.length >= 3 ? 'Maks tre nedtellinger per klasse' : 'Opprett ny nedtelling'}
              disabled={countdowns.length >= 3}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                if (countdowns.length >= 3) { alert('Hver klasse kan ha maks tre nedtellinger.'); return; }
                onAddCountdown();
              }}
            >+</button>
            <button
              type="button"
              className={`countdown-tool-btn${countdowns.length === 0 ? ' is-disabled' : ''}`}
              id="countdown-visibility-btn"
              aria-label={countdownsVisible ? 'Skjul nedtellinger' : 'Vis nedtellinger'}
              title={countdownsVisible ? 'Skjul nedtellinger' : 'Vis nedtellinger'}
              disabled={countdowns.length === 0}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                if (!countdowns.length) return;
                onToggleCountdownVisibility();
              }}
            >{countdownsVisible ? '👁' : '🙈'}</button>
          </div>
        </div>

        {/* Agenda */}
        <div className="toolbox-item" id="tool-agenda" onClick={e => {
          e.stopPropagation();
          onOpenAgenda();
          closeToolbox();
        }}>
          <span className="icon">📋</span>
          <span className="label">Agenda</span>
        </div>

        {/* Note */}
        <div className="toolbox-item" id="tool-note" onClick={e => {
          e.stopPropagation();
          onOpenNote();
        }}>
          <span className="icon">🗒️</span>
          <span className="label">Notat</span>
        </div>

        {/* Class */}
        <div className="toolbox-item" id="tool-class" onClick={e => {
          e.stopPropagation();
          onOpenClass();
        }}>
          <span className="icon">🏫</span>
          <span className="label">Klasse</span>
        </div>

        {/* Calendar / Time Picker */}
        <div className="toolbox-item" id="tool-calendar" onClick={e => {
          e.stopPropagation();
          if (timePickerOpen) {
            onCloseTimePicker();
          } else {
            onOpenTimePicker();
            closeToolbox();
          }
        }}>
          <span className="icon">📅</span>
          <span className="label">Velg tid</span>
        </div>

        {/* Lock */}
        <div className="toolbox-item" id="tool-lock" onClick={() => onToggleLock()}>
          <span className="icon" id="lock-icon">{editPermission ? '🔓' : '🔒'}</span>
          <span className="label" id="lock-label">{editPermission ? 'Låst opp' : 'Lås opp'}</span>
        </div>
      </div>

    </div>
  );
}
