import { useState, useEffect, useRef } from 'react';
import ThemeSwitch from './ThemeSwitch.jsx';
import Ikon from './Ikon.jsx';
import useRolig from '../hooks/useRolig.js';

export default function Toolbox({
  themeMode,
  onSetTheme,
  onOpenTimer,
  onOpenPlanlegg,
  onOpenAgenda,
  onOpenNote,
  onOpenClass,
  currentClass,
  onAddCountdown,
  onToggleCountdownVisibility,
  onEnterWallMode,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  // Starter med navnet «Verktøy», krymper til bare kofferten når ingen rører skjermen
  const { synlig: navnSynlig } = useRolig();

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

  // «Dager til»-raden ligger i et høyere lag enn menyen og dekket temabryteren
  // på iPad; mens menyen er åpen, viker den (se del-ipad-overlapp.css)
  useEffect(() => {
    document.body.classList.toggle('verktoy-apen', open);
    return () => document.body.classList.remove('verktoy-apen');
  }, [open]);

  useEffect(() => {
    if (open) resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleMouseMove(e) {
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
  }, [open]);

  return (
    <div className={`toolbox-container${open ? ' active' : ''}${navnSynlig ? '' : ' er-rolig'}`} id="toolbox-container" ref={containerRef}>
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
        title="Verktøy"
        aria-expanded={open}
      ><Ikon navn="verktoykasse" /><span className="toolbox-main-label">Verktøy</span></div>

      <div className="toolbox-items">
        {/* Gruppert etter hvor ofte læreren trenger det: det som brukes i hver time
            øverst, det som styrer hva skjermen viser i midten, oppsett nederst */}
        <p className="toolbox-gruppe" aria-hidden="true">I timen</p>

        <div className="toolbox-item" id="tool-timer" role="button" onClick={e => {
          e.stopPropagation();
          onOpenTimer();
          resetTimer();
        }}>
          <span className="icon"><Ikon navn="timer" /></span>
          <span className="label">Nedteller</span>
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

        <div className="toolbox-item" id="tool-agenda" role="button" onClick={e => {
          e.stopPropagation();
          onOpenAgenda();
          closeToolbox();
        }}>
          <span className="icon"><Ikon navn="list-checks" /></span>
          <span className="label">Agenda</span>
        </div>

        <div className="toolbox-item" id="tool-note" role="button" onClick={e => {
          e.stopPropagation();
          onOpenNote();
        }}>
          <span className="icon"><Ikon navn="notebook-pen" /></span>
          <span className="label">Notat</span>
        </div>

        <p className="toolbox-gruppe" aria-hidden="true">På skjermen</p>

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

        <div className="toolbox-item" id="tool-wall" role="button" onClick={e => {
          e.stopPropagation();
          closeToolbox();
          onEnterWallMode?.();
        }}>
          <span className="icon"><Ikon navn="tv" /></span>
          <span className="label">Veggskjerm</span>
        </div>

        <div className="toolbox-item theme-switch-tool" id="tool-mode" onClick={e => e.stopPropagation()}>
          <ThemeSwitch themeMode={themeMode} onSetTheme={mode => { onSetTheme(mode); resetTimer(); }} />
        </div>

        <p className="toolbox-gruppe" aria-hidden="true">Oppsett</p>

        <div className="toolbox-item" id="tool-class" role="button" onClick={e => {
          e.stopPropagation();
          closeToolbox();
          onOpenClass();
        }}>
          <span className="icon"><Ikon navn="school" /></span>
          <span className="label">Klasse og timeplan</span>
        </div>

      </div>

    </div>
  );
}
