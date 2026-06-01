export function getThemeModeIcon(modeValue) {
  const mode = String(modeValue);
  if (mode === '0') return '☀';
  if (mode === '1') return '☾';
  if (mode === '2') return '✦';
  return '🌈';
}

export function getThemeModeVisualIndex(modeValue) {
  const mode = String(modeValue);
  if (mode === '3') return 0;
  if (mode === '0') return 1;
  if (mode === '1') return 2;
  return 3; // mode 2 (star)
}

export default function ThemeSwitch({ themeMode, onSetTheme }) {
  const mode = String(themeMode);
  const visualIndex = getThemeModeVisualIndex(mode);
  const icon = getThemeModeIcon(mode);

  return (
    <div
      className={`theme-switch-control mode-${mode}`}
      id="theme-switch-control"
      role="tablist"
      aria-label="Velg tema"
    >
      <div
        className={`theme-switch-thumb mode-${mode}`}
        id="theme-switch-thumb"
        aria-hidden="true"
        style={{ transform: `translateX(${visualIndex * 100}%)` }}
      >
        <span className="theme-switch-thumb-icon" id="theme-switch-thumb-icon">{icon}</span>
      </div>
      <button type="button" className={`theme-step${mode === '3' ? ' active' : ''}`} data-mode="3" aria-label="Fargerik modus" onClick={e => { e.stopPropagation(); onSetTheme('3'); }} onMouseDown={e => e.stopPropagation()}>🌈</button>
      <button type="button" className={`theme-step${mode === '0' ? ' active' : ''}`} data-mode="0" aria-label="Lys modus" onClick={e => { e.stopPropagation(); onSetTheme('0'); }} onMouseDown={e => e.stopPropagation()}>☀</button>
      <button type="button" className={`theme-step${mode === '1' ? ' active' : ''}`} data-mode="1" aria-label="Mørk modus" onClick={e => { e.stopPropagation(); onSetTheme('1'); }} onMouseDown={e => e.stopPropagation()}>☾</button>
      <button type="button" className={`theme-step${mode === '2' ? ' active' : ''}`} data-mode="2" aria-label="Stjernemodus" onClick={e => { e.stopPropagation(); onSetTheme('2'); }} onMouseDown={e => e.stopPropagation()}>✦</button>
    </div>
  );
}
