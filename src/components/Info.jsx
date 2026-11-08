/**
 * Forklarende tekst med et lite (i)-merke foran, lånt fra «Kooperative grupper»:
 * én eller to setninger, aldri lange avsnitt. `felt` gir en rolig ramme rundt.
 */
export default function Info({ children, felt = false, className = '', id }) {
  return (
    <p id={id} className={`info${felt ? ' info-felt' : ''} ${className}`.trim()}>
      <svg
        className="info-ikon"
        width={felt ? 18 : 15}
        height={felt ? 18 : 15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20zM12 11v5.5M12 7.5h.01" />
      </svg>
      <span>{children}</span>
    </p>
  );
}
