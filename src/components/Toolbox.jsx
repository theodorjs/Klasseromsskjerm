import { useState, useEffect, useRef } from 'react';
import ThemeSwitch from './ThemeSwitch.jsx';
import Ikon from './Ikon.jsx';

export default function Toolbox({
  themeMode,
  onSetTheme,
  onOpenTimer,
  onOpenPlanlegg,
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
  onEnterWallMode,
  onPresent,
}) {
  const [open, setOpen] = useState(false);
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
    if (!open) return;
    function handleMouseMove(e) {
      if (timePickerOpen) { resetTimer(); return; }
      const container = containerRef.current;
      if (!container) return;

      // Mål både verktøykasse-knappen OG den nedhengende lista
      const btnRect   = container.getBoundingClientRect();
      const itemsEl   = container.querySelector('.toolbox-items');
      const itemsRect = itemsEl?.getBoundingClientRect();

      // Slå sammen til ett felles rektangel
      const left   = Math.min(btnRect.left,   itemsRect ? itemsRect.left   : btnRect.left);
      const right  = Math.max(btnRect.right,  itemsRect ? itemsRect.right  : btnRect.right);
      const top    = Math.min(btnRect.top,    itemsRect ? itemsRect.top    : btnRect.top);
      const bottom = Math.max(btnRect.bottom, itemsRect ? itemsRect.bottom : btnRect.bottom);

      const padding = 80;
      if (
        e.clientX < left  - padding ||
        e.clientX > right + padding ||
        e.clientY < top   - padding ||
        e.clientY > bottom + padding
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
        role="button"
        aria-label={open ? 'Lukk verktøykassa' : 'Åpne verktøykassa'}
        aria-expanded={open}
      ><Ikon navn="verktoykasse" /><span className="toolbox-main-label">Verktøy</span></div>

      <div className="toolbox-items">
        {/* Theme Switch */}
        <div className="toolbox-item theme-switch-tool" id="tool-mode" onClick={e => e.stopPropagation()}>
          <ThemeSwitch themeMode={themeMode} onSetTheme={mode => { onSetTheme(mode); resetTimer(); }} />
        </div>

        {/* Sett opp dagens time: tittel, tid, mål og agenda */}
        <div className="toolbox-item toolbox-item--time" id="tool-plan" role="button" onClick={e => {
          e.stopPropagation();
          closeToolbox();
          onOpenPlanlegg?.();
        }}>
          <span className="icon"><Ikon navn="clipboard-list" /></span>
          <span className="label">Sett opp timen</span>
        </div>

        {/* Timer */}
        <div className="toolbox-item" id="tool-timer" onClick={e => {
          e.stopPropagation();
          onOpenTimer();
          resetTimer();
        }}>
          <span className="icon"><Ikon navn="timer" /></span>
          <span className="label">Nedteller</span>
        </div>

        {/* Vis for klassen: fullskjerm og ren elevvisning, Esc for å gå tilbake */}
        {onPresent && (
          <div className="toolbox-item" id="vis-for-klassen" role="button"
            title="Fullskjerm for klassen, uten verktøyene. Esc for å gå tilbake."
            onClick={e => {
              e.stopPropagation();
              closeToolbox();
              onPresent();
            }}>
            <span className="icon"><Ikon navn="presentation" /></span>
            <span className="label">Vis for klassen</span>
          </div>
        )}

        {/* Countdown */}
        <div className="toolbox-item countdown-tool" id="tool-countdown"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <span className="icon"><Ikon navn="calendar-days" /></span>
          <span className="label">Dager til</span>
          <div className="countdown-tool-actions">
            <button
              type="button"
              className={`countdown-tool-btn${countdowns.length >= 3 ? ' is-disabled' : ''}`}
              id="countdown-add-btn"
              aria-label="Legg til en dato å telle dager til"
              title={countdowns.length >= 3 ? 'Maks tre datoer per klasse' : 'Legg til en dato å telle dager til'}
              disabled={countdowns.length >= 3}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                if (countdowns.length >= 3) { alert('Hver klasse kan ha maks tre datoer i «Dager til».'); return; }
                onAddCountdown();
              }}
            ><Ikon navn="plus" /></button>
            <button
              type="button"
              className={`countdown-tool-btn${countdowns.length === 0 ? ' is-disabled' : ''}`}
              id="countdown-visibility-btn"
              aria-label={countdownsVisible ? 'Skjul «Dager til»' : 'Vis «Dager til»'}
              title={countdownsVisible ? 'Skjul «Dager til»' : 'Vis «Dager til»'}
              disabled={countdowns.length === 0}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                if (!countdowns.length) return;
                onToggleCountdownVisibility();
              }}
            ><Ikon navn={countdownsVisible ? 'eye' : 'eye-off'} /></button>
          </div>
        </div>

        {/* Agenda */}
        <div className="toolbox-item" id="tool-agenda" onClick={e => {
          e.stopPropagation();
          onOpenAgenda();
          closeToolbox();
        }}>
          <span className="icon"><Ikon navn="list-checks" /></span>
          <span className="label">Agenda</span>
        </div>

        {/* Note */}
        <div className="toolbox-item" id="tool-note" onClick={e => {
          e.stopPropagation();
          onOpenNote();
        }}>
          <span className="icon"><Ikon navn="notebook-pen" /></span>
          <span className="label">Notat</span>
        </div>

        {/* Class */}
        <div className="toolbox-item" id="tool-class" onClick={e => {
          e.stopPropagation();
          onOpenClass();
        }}>
          <span className="icon"><Ikon navn="school" /></span>
          <span className="label">Klasse og timeplan</span>
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
          <span className="icon"><Ikon navn="calendar-clock" /></span>
          <span className="label">Velg tid</span>
        </div>

        {/* Veggskjerm */}
        <div className="toolbox-item" id="tool-wall" onClick={e => {
          e.stopPropagation();
          closeToolbox();
          onEnterWallMode?.();
        }}>
          <span className="icon"><Ikon navn="tv" /></span>
          <span className="label">Veggskjerm</span>
        </div>

        {/* Lock */}
        <div className="toolbox-item" id="tool-lock" onClick={() => onToggleLock()}>
          <span className="icon" id="lock-icon"><Ikon navn={editPermission ? 'lock-open' : 'lock'} /></span>
          <span className="label" id="lock-label">{editPermission ? 'Låst opp' : 'Lås opp'}</span>
        </div>
      </div>

    </div>
  );
}
