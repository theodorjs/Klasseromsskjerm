import { useState, useEffect, useRef, useCallback } from 'react';
import Ikon from './Ikon.jsx';
import useSkjermVaaken from '../hooks/useSkjermVaaken.js';
import TimeTimerDial from './TimeTimerDial.jsx';
import { normalizeHexColor } from '../utils/color.js';
import {
  loadTimerSettings, saveTimerSettings,
  loadTimerRun, saveTimerRun,
  clampDuration, formatTimerReadout, formatDurationLabel,
  loadTimerPosition, saveTimerPosition, clampTimerPosition,
  primeTimerAudio, playTimerChime,
  TIMER_PRESETS_MIN, TIMER_CLASSIC_RED, MAX_DURATION_MS,
} from '../utils/timer.js';

/** Hvor lenge «Tiden er ute» står etter at en reload fant en utløpt timer. */
const DONE_GRACE_MS = 10 * 60 * 1000;

/**
 * Nedteller i TimeTimer-stil. Skiva er full når timeren starter og krymper
 * mot null. Fargen følger faget som pågår, med mulighet for egen farge.
 * Kjøringen lagres, så timeren overlever at siden lastes på nytt.
 */
export default function TimerPanel({ open, onClose, onRequestOpen, subjectColor, subjectName }) {
  const [settings, setSettings] = useState(loadTimerSettings);
  const [run, setRun] = useState(() => {
    const saved = loadTimerRun();
    if (!saved) return null;
    if (saved.endAt !== null && saved.endAt <= Date.now()) {
      // Utløp mens siden var lukket: vis «ferdig» en stund, ellers start blankt
      return Date.now() - saved.endAt < DONE_GRACE_MS ? { ...saved, done: true } : null;
    }
    return saved;
  });
  const [now, setNow] = useState(() => Date.now());
  const [colorOpen, setColorOpen] = useState(false);
  const [big, setBig] = useState(false);
  // Panelet kan dras rundt i lite format; plassen huskes per enhet
  const [pos, setPos] = useState(loadTimerPosition);
  const panelRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => { saveTimerPosition(pos); }, [pos]);

  function onHandlePointerDown(e) {
    if (big || e.button > 0) return;
    if (e.target.closest('button, input, label, a')) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onHandlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const panel = panelRef.current;
    const next = clampTimerPosition({ x: e.clientX - drag.dx, y: e.clientY - drag.dy }, panel.offsetWidth, panel.offsetHeight);
    drag.moved = true;
    setPos(next);
  }
  function onHandlePointerUp() {
    dragRef.current = null;
  }
  function resetPosition() {
    setPos(null);
  }
  const closeBtnRef = useRef(null);
  const chimedRef = useRef(false);

  const running = !!run && run.endAt !== null && !run.done;
  // Skjermen skal ikke slukke mens klassen ser på den store skiva
  useSkjermVaaken(open && big && !!run);
  const paused = !!run && run.endAt === null && !run.done;
  const done = !!run?.done;
  const totalMs = run?.totalMs ?? settings.durationMs;
  const remainingMs = run
    ? (run.done ? 0 : (run.endAt !== null ? Math.max(0, run.endAt - now) : run.pausedRemainingMs))
    : settings.durationMs;

  const followColor = normalizeHexColor(subjectColor) || TIMER_CLASSIC_RED;
  const discColor = settings.colorOverride || followColor;

  // Når tiden er ute: stopp, lagre, ring og åpne panelet hvis det er lukket.
  // Ligger i en ref så klokka under alltid kaller nyeste versjon.
  const finishRef = useRef(null);
  useEffect(() => {
    finishRef.current = () => {
      if (!run || run.done) return;
      const finished = { ...run, endAt: null, pausedRemainingMs: 0, done: true };
      setRun(finished);
      saveTimerRun({ totalMs: finished.totalMs, endAt: Date.now(), pausedRemainingMs: 0 });
      if (settings.sound && !chimedRef.current) {
        chimedRef.current = true;
        playTimerChime();
      }
      if (!open) onRequestOpen?.();
    };
  });

  // Klokke: jevn mens panelet er åpent, ellers sjeldnere. Stopper selv ved null.
  const endAt = run?.endAt ?? null;
  useEffect(() => {
    if (!running || endAt === null) return undefined;
    let frame = null;
    let interval = null;
    const tick = () => {
      const t = Date.now();
      if (t >= endAt) {
        setNow(endAt);
        finishRef.current?.();
        return;
      }
      setNow(t);
      if (open) frame = requestAnimationFrame(tick);
    };
    if (open) frame = requestAnimationFrame(tick);
    else interval = setInterval(tick, 500);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (interval) clearInterval(interval);
    };
  }, [running, endAt, open]);

  // Fokus bare idet panelet åpner: effekten under kjører på nytt for hver
  // klokketikk (onClose er ny hver gang), og ville ellers stjålet fokus hvert sekund.
  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // Lukk ett lag om gangen: fargevelger, stor visning, så panelet
      if (colorOpen) { setColorOpen(false); return; }
      if (big) { setBig(false); return; }
      onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, big, colorOpen]);

  const updateSettings = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveTimerSettings(next);
      return next;
    });
  }, []);

  function persistRun(next) {
    setRun(next);
    saveTimerRun(next ? { totalMs: next.totalMs, endAt: next.endAt, pausedRemainingMs: next.pausedRemainingMs } : null);
  }

  function start() {
    primeTimerAudio();
    chimedRef.current = false;
    const base = paused ? run.pausedRemainingMs : settings.durationMs;
    const total = paused ? run.totalMs : settings.durationMs;
    if (!base || base <= 0) return;
    setNow(Date.now());
    persistRun({ totalMs: total, endAt: Date.now() + base, pausedRemainingMs: null, done: false });
  }

  function pause() {
    if (!running) return;
    persistRun({ ...run, endAt: null, pausedRemainingMs: Math.max(0, run.endAt - Date.now()) });
  }

  function reset() {
    chimedRef.current = false;
    persistRun(null);
  }

  function setDuration(ms) {
    updateSettings({ durationMs: clampDuration(ms) });
    if (run) persistRun(null);
  }

  function nudge(deltaMs) {
    if (running || paused) {
      // Juster pågående timer: både gjenstående og total flyttes, så skiva ikke hopper
      const rem = running ? Math.max(0, run.endAt - Date.now()) : run.pausedRemainingMs;
      const nextRem = Math.min(MAX_DURATION_MS, Math.max(0, rem + deltaMs));
      if (nextRem <= 0) {
        // Trukket ned til null: da er tiden ute, ikke «pause på 00:00»
        finishRef.current?.();
        return;
      }
      const nextTotal = Math.max(nextRem, Math.min(MAX_DURATION_MS, run.totalMs + deltaMs));
      persistRun(running
        ? { ...run, totalMs: nextTotal, endAt: Date.now() + nextRem }
        : { ...run, totalMs: nextTotal, pausedRemainingMs: nextRem });
      return;
    }
    // «−» stopper på ett minutt; en kortere varighet (fra lagring) blir aldri lengre av å trykke −
    const floor = Math.min(settings.durationMs, 60000);
    setDuration(Math.max(floor, settings.durationMs + deltaMs));
  }

  const readout = formatTimerReadout(remainingMs);
  const durationMinutes = Math.round(settings.durationMs / 60000);
  const statusText = done
    ? 'Tiden er ute'
    : running ? 'Teller ned' : paused ? 'Pause' : `Klar: ${formatDurationLabel(settings.durationMs)}`;

  const colorLabel = settings.colorOverride
    ? 'Egen farge'
    : (subjectName ? `Følger faget: ${subjectName}` : 'Klassisk rød (ingen time nå)');

  const showMini = !open && (running || paused || done);

  return (
    <>
      {showMini && (
        <button
          type="button"
          className={`timer-mini${done ? ' is-done' : ''}`}
          onClick={onRequestOpen}
          aria-label={`Nedteller: ${done ? 'tiden er ute' : readout}. Åpne.`}
        >
          <TimeTimerDial totalMs={totalMs} remainingMs={remainingMs} mode={settings.mode} color={discColor} size={44} done={done} className="tt-dial-mini" />
          <span className="timer-mini-readout">{done ? 'Ferdig' : readout}</span>
        </button>
      )}

      <div
        ref={panelRef}
        className={`timer-panel${open ? ' active' : ''}${big ? ' is-big' : ''}${pos && !big ? ' is-moved' : ''}`}
        id="timer-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Nedteller"
        style={pos && !big ? { left: pos.x, top: pos.y } : undefined}
      >
        <div className={`tt-device${done ? ' is-done' : ''}`}>
          <button ref={closeBtnRef} type="button" className="tt-close" id="timer-close-btn" aria-label={big ? 'Tilbake til liten visning' : 'Lukk nedteller'} onClick={() => { setColorOpen(false); if (big) setBig(false); else onClose(); }}><Ikon navn="x" /></button>

          <div
            className="tt-plate"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            onDoubleClick={() => { if (!big) resetPosition(); }}
            title={big ? undefined : 'Dra for å flytte nedtelleren. Dobbelttrykk for å legge den tilbake.'}
          >
            <TimeTimerDial
              totalMs={totalMs}
              remainingMs={remainingMs}
              mode={settings.mode}
              color={discColor}
              size={300}
              done={done}
              title={`Nedteller, ${readout} igjen`}
            />

            <div className="tt-readout">
              <span className="tt-readout-time">{done ? '0:00' : readout}</span>
              {/* Bare statusordene leses opp, aldri sekundtelleren */}
              <span className="tt-readout-status" role="status" aria-live="polite">{statusText}</span>
            </div>

            <div className="tt-controls" role="group" aria-label="Styr nedtelleren">
              {!running && (
                <button type="button" className="k-btn k-btn--ny k-btn--fylt tt-main-btn" id="timer-start" onClick={start}>
                  <Ikon navn="play" /> {paused ? 'Fortsett' : done ? 'Start på nytt' : 'Start'}
                </button>
              )}
              {running && (
                <button type="button" className="k-btn k-btn--rediger tt-main-btn" id="timer-pause" onClick={pause}><Ikon navn="pause" /> Pause</button>
              )}
              <button type="button" className="k-btn k-btn--tilbake" id="timer-reset" onClick={reset} disabled={!run}>Nullstill</button>
              {!big && (
                <button type="button" className="k-btn" id="timer-big" onClick={() => setBig(true)} title="Fyll skjermen med skiva"><Ikon navn="maximize" /> Stor</button>
              )}
            </div>
          </div>

          <div className="tt-settings">
            <div className="tt-row">
              <span className="tt-row-label">Varighet</span>
              <div className="tt-stepper" role="group" aria-label="Juster minutter">
                <button type="button" className="tt-step" aria-label="Ett minutt mindre" onClick={() => nudge(-60000)}><Ikon navn="minus" /></button>
                <span className="tt-step-value">{running || paused ? readout : `${durationMinutes} min`}</span>
                <button type="button" className="tt-step" aria-label="Ett minutt mer" onClick={() => nudge(60000)}><Ikon navn="plus" /></button>
              </div>
            </div>
            <div className="tt-presets" role="group" aria-label="Hurtigvalg">
              {TIMER_PRESETS_MIN.map(min => (
                <button
                  key={min}
                  type="button"
                  className={`tt-preset${!run && durationMinutes === min && settings.durationMs % 60000 === 0 ? ' is-active' : ''}`}
                  aria-label={`${min} ${min === 1 ? 'minutt' : 'minutter'}`}
                  aria-pressed={!run && durationMinutes === min && settings.durationMs % 60000 === 0}
                  onClick={() => setDuration(min * 60000)}
                >{min}</button>
              ))}
            </div>

            <div className="tt-row tt-row-skive">
              <span className="tt-row-label">Skive</span>
              <div className="tt-segment" role="group" aria-label="Skala på skiva">
                <button type="button" aria-pressed={settings.mode === 'fit'} className={`tt-seg${settings.mode === 'fit' ? ' is-active' : ''}`} title="Hele skiva tilsvarer tiden du har valgt. Bare streker, uten tall." onClick={() => updateSettings({ mode: 'fit' })}>Valgt tid</button>
                <button type="button" aria-pressed={settings.mode === 'fixed60'} className={`tt-seg${settings.mode === 'fixed60' ? ' is-active' : ''}`} title="Skiva er alltid 60 minutter, som den fysiske" onClick={() => updateSettings({ mode: 'fixed60' })}>60 min</button>
              </div>
              <div className="tt-color">
                <button
                  type="button"
                  className="tt-round tt-color-btn"
                  style={{ '--disc': discColor }}
                  aria-expanded={colorOpen}
                  aria-label={`Farge på skiva (${colorLabel}). Endre`}
                  title={colorLabel}
                  onClick={() => setColorOpen(v => !v)}
                >
                  <span className="tt-color-fill" aria-hidden="true" />
                  <span className="tt-color-glyph" aria-hidden="true"><Ikon navn="palette" /></span>
                </button>
                {colorOpen && (
                  <div className="tt-color-pop">
                    <span className="tt-color-now">{colorLabel}</span>
                    <label className="tt-color-pick">
                      <input
                        type="color"
                        value={discColor}
                        aria-label="Velg farge på skiva"
                        onChange={e => updateSettings({ colorOverride: normalizeHexColor(e.target.value) })}
                      />
                      <span>Velg farge</span>
                    </label>
                    <button type="button" className="k-btn k-btn--tilbake k-btn--liten" onClick={() => { updateSettings({ colorOverride: null }); setColorOpen(false); }} disabled={!settings.colorOverride}>
                      Følg faget
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`tt-round tt-bell${settings.sound ? ' is-on' : ''}`}
                role="switch"
                aria-checked={settings.sound}
                aria-label="Lyd når tiden er ute"
                title={settings.sound ? 'Klokke når tiden er ute. Trykk for å slå av.' : 'Stille. Trykk for å slå på klokka.'}
                onClick={() => { primeTimerAudio(); updateSettings({ sound: !settings.sound }); }}
              >
                <Ikon navn={settings.sound ? 'bell' : 'bell-off'} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
