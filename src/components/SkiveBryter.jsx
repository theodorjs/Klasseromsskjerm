import Ikon from './Ikon.jsx';

/**
 * Lite symbol øverst til venstre i «Nå»-boksen som viser og skjuler skiva.
 * Fylt kakestykke: skiva vises. Bare omriss: skiva er skjult.
 */
export default function SkiveBryter({ vis, onVeksle }) {
  return (
    <button
      type="button"
      className={`hs-skive-bryter${vis ? ' er-paa' : ''}`}
      onClick={onVeksle}
      aria-pressed={vis}
      aria-label={vis ? 'Skjul skiva' : 'Vis skiva'}
      title={vis ? 'Skjul skiva, så faget står midt i boksen' : 'Vis skiva med tiden som er igjen'}
    >
      <Ikon navn="skive" />
    </button>
  );
}
