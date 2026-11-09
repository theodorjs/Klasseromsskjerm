/**
 * TimeTimer-inspirert urskive: en farget skive som krymper mot klokka
 * (full ved start, tom ved null), tall rundt kanten og en liten nav i midten.
 *
 * To skalaer:
 *   'fit'     – hele sirkelen tilsvarer total tid (5 min eller 60 min gir begge full skive).
 *               Bare streker, ingen tall: tallene ville betydd noe nytt for hver varighet
 *               (og blitt 0,5, 1,5 … på korte tider). Nøyaktig tid står i avlesningen.
 *   'fixed60' – sirkelen er alltid 60 minutter, som en fysisk TimeTimer, med tall
 *
 * Tegnes som SVG og skalerer med `size`. Fargene på plate, tall og streker
 * styres av CSS-variablene --tt-ink og --tt-tick, så den følger lyst/mørkt tema.
 */

import { buildDialScale } from '../utils/timer.js';

const VIEW = 400;
const CX = VIEW / 2;
const CY = VIEW / 2;
const R_DISC = 128;      // den fargede skiva
const R_TICK_OUT = 150;  // ytterkant på strekene
const R_LABEL = 178;     // tallene

/** Punkt på sirkelen, der vinkelen måles mot klokka fra toppen (slik en TimeTimer går). */
function polar(radius, fraction) {
  const angle = fraction * Math.PI * 2;
  return { x: CX - radius * Math.sin(angle), y: CY - radius * Math.cos(angle) };
}

/** Sektor fra toppen og mot klokka, `fraction` av hele sirkelen. */
function sectorPath(fraction) {
  const f = Math.max(0, Math.min(1, fraction));
  if (f <= 0) return '';
  if (f >= 0.9995) {
    // Full sirkel: to halvbuer, ellers tegnes ingenting
    return `M ${CX} ${CY - R_DISC} A ${R_DISC} ${R_DISC} 0 1 0 ${CX} ${CY + R_DISC} A ${R_DISC} ${R_DISC} 0 1 0 ${CX} ${CY - R_DISC} Z`;
  }
  const start = polar(R_DISC, 0);
  const end = polar(R_DISC, f);
  const largeArc = f > 0.5 ? 1 : 0;
  // sweep-flag 0 = mot klokka på skjermen
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${R_DISC} ${R_DISC} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function TimeTimerDial({
  totalMs = 0,
  remainingMs = 0,
  mode = 'fit',
  color = '#E8412C',
  size = 280,
  done = false,
  className = '',
  title,
}) {
  const scale = buildDialScale(totalMs, mode);
  const remainingUnits = Math.max(0, remainingMs / 1000 / scale.unitSeconds);
  const fraction = scale.total > 0 ? Math.min(1, remainingUnits / scale.total) : 0;
  const showLabels = mode !== 'fit';

  const ticks = [];
  const labels = [];
  const stepCount = Math.round(scale.total / scale.minorStep);
  for (let i = 0; i <= stepCount; i++) {
    const value = i * scale.minorStep;
    if (value > scale.total + 1e-9) break;
    const f = value / scale.total;
    // Siste strek faller oppå null-streken når skalaen er full
    if (i === stepCount && Math.abs(f - 1) < 1e-9) break;
    const isMajor = Math.abs((value / scale.labelStep) - Math.round(value / scale.labelStep)) < 1e-9;
    const inner = polar(isMajor ? R_TICK_OUT - 16 : R_TICK_OUT - 8, f);
    const outer = polar(R_TICK_OUT, f);
    ticks.push(
      <line
        key={`t${i}`}
        x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
        className={isMajor ? 'tt-tick tt-tick-major' : 'tt-tick'}
      />
    );
    if (isMajor && showLabels) {
      const p = polar(R_LABEL, f);
      const shown = Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',');
      labels.push(
        <text key={`l${i}`} x={p.x} y={p.y} className="tt-label" textAnchor="middle" dominantBaseline="central">
          {shown}
        </text>
      );
    }
  }

  return (
    <svg
      className={`tt-dial${done ? ' is-done' : ''} ${className}`.trim()}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      role="img"
      aria-label={title || 'Nedtellingsskive'}
    >
      {title && <title>{title}</title>}
      {/* Svakt forsenket sirkel bak skiva, som vinduet på en fysisk TimeTimer */}
      <circle cx={CX} cy={CY} r={R_TICK_OUT + 4} className="tt-well" />
      {ticks}
      {labels}
      {fraction > 0 && (
        <path d={sectorPath(fraction)} fill={color} className="tt-disc" />
      )}
      {/* Enheten står under navet, så tallene aldri er tvetydige */}
      {showLabels && (
        <text x={CX} y={CY + 64} className="tt-unit" textAnchor="middle" dominantBaseline="central">{scale.unitLabel}</text>
      )}
      {/* Nav med «skrue» */}
      <circle cx={CX} cy={CY} r={26} className="tt-hub" />
      <circle cx={CX} cy={CY} r={9} className="tt-knob" />
      <circle cx={CX} cy={CY} r={3.5} className="tt-knob-center" />
    </svg>
  );
}
