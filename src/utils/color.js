import { colorMap, subjectMap } from '../data/constants.js';

export const TIMER_GRADIENT_DEFAULT = '#20D5E9';

export function normalizeHexColor(rawColor) {
  if (typeof rawColor !== 'string') return null;
  const value = rawColor.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

export function hexToRgbChannels(hexColor) {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
}

export function getRelativeLuminance(hexColor) {
  const rgb = hexToRgbChannels(hexColor);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

export function getContrastRatio(colorA, colorB) {
  const luminanceA = getRelativeLuminance(colorA);
  const luminanceB = getRelativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableAgendaTextColor(backgroundHex) {
  const white = '#F8FBFF';
  const dark = '#5F5F5F';
  return getContrastRatio(backgroundHex, dark) >= getContrastRatio(backgroundHex, white) ? dark : white;
}

export function hexToHsl(hexColor) {
  const normalized = normalizeHexColor(hexColor) || TIMER_GRADIENT_DEFAULT;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = ((b - r) / delta) + 2;
    else h = ((r - g) / delta) + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  return {
    h,
    s: Math.round((s || 0) * 100),
    l: Math.round(l * 100)
  };
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Compute timer gradient colors from a base color.
 * Returns { baseColor, partnerColor } without touching the DOM.
 */
export function computeTimerGradientColors(baseHexColor) {
  const baseColor = normalizeHexColor(baseHexColor) || TIMER_GRADIENT_DEFAULT;
  const { h, s, l } = hexToHsl(baseColor);
  const partnerHue = (h + 90) % 360;
  const partnerColor = hslToHex(partnerHue, s, l);
  return { baseColor, partnerColor };
}

export function getSubjectDefaultColor(subject) {
  if (!subject) return '#ffffff';

  // Direkte treff
  if (colorMap[subject]) return colorMap[subject];

  // Strip trinnsuffiks («Norsk 7.-8.» → «Norsk», «Kunst og håndverk 7.» → «Kunst og håndverk»)
  const stripped = String(subject)
    .replace(/\s+\d+\.-\d+\.?$/, '')
    .replace(/\s+\d+\.?$/, '')
    .trim();

  if (stripped && colorMap[stripped]) return colorMap[stripped];

  // Slå opp via subjectMap (for å håndtere kortformer o.l.)
  const lookup = (stripped || subject).toUpperCase();
  const subjectInfo = Object.values(subjectMap).find(s =>
    s.full.toUpperCase() === lookup || s.short.toUpperCase() === lookup
  );
  const name = subjectInfo ? subjectInfo.full : (stripped || subject);
  return colorMap[name] || '#ffffff';
}
