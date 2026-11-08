import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  buildSharePayload,
  encodeSharePayload,
  validateSharePayload,
  buildShareUrl,
  SHARE_URL_SOFT_LIMIT,
} from '../utils/share.js';

/** Over denne lengden blir QR-koden for tett til å skannes fra en tavle. */
const QR_MAX_LENGTH = 1500;

/**
 * Tegner QR-koden skarpt: fysisk oppløsning følger skjermens pikseltetthet,
 * CSS-størrelsen settes etterpå (qrcode setter begge til samme tall).
 */
function drawQr(canvas, url, cssSize) {
  if (!canvas || !url) return Promise.resolve();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  return QRCode.toCanvas(canvas, url, {
    width: Math.round(cssSize * dpr),
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#1C2735', light: '#FFFFFF' },
  }).then(() => {
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
  });
}

export default function ShareModal({ open, classData, className, onClose }) {
  // Lenken utledes direkte fra klassedataene; «Kopiert» gjelder bare for akkurat den lenken.
  const [copiedUrl, setCopiedUrl] = useState('');
  const [bigQr, setBigQr] = useState(false);
  const canvasRef = useRef(null);
  const bigCanvasRef = useRef(null);
  const inputRef = useRef(null);
  const copyBtnRef = useRef(null);

  const displayName = classData?.name || className || '';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const { url, error } = useMemo(() => {
    if (!open) return { url: '', error: '' };
    try {
      // Samme validering som mottakeren kjører, så feil oppdages hos avsender
      const payload = validateSharePayload(buildSharePayload(classData, className));
      return { url: buildShareUrl(encodeSharePayload(payload)), error: '' };
    } catch (err) {
      console.error('Kunne ikke lage delingslenke:', err);
      return { url: '', error: `Timeplanen kan ikke deles slik den er nå: ${err?.message || 'ukjent feil.'}` };
    }
  }, [open, classData, className]);

  const copied = !!url && copiedUrl === url;
  const tooLongForQr = url.length > QR_MAX_LENGTH;

  useEffect(() => {
    if (!open || !url || tooLongForQr) return;
    drawQr(canvasRef.current, url, 256).catch(err => console.warn('Kunne ikke tegne QR-kode:', err));
  }, [open, url, tooLongForQr]);

  useEffect(() => {
    if (!bigQr || !url) return;
    const size = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.78);
    drawQr(bigCanvasRef.current, url, size).catch(err => console.warn('Kunne ikke tegne QR-kode:', err));
  }, [bigQr, url]);

  function handleClose() {
    setBigQr(false);
    onClose();
  }

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (bigQr) setBigQr(false);
      else handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bigQr, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => copyBtnRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [open]);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
    } catch {
      // Eldre nettlesere: marker teksten så læreren kan kopiere selv
      inputRef.current?.focus();
      inputRef.current?.select();
      try {
        document.execCommand('copy');
        setCopiedUrl(url);
      } catch {
        setCopiedUrl('');
      }
    }
  }

  async function shareLink() {
    if (!url || !canShare) return;
    try {
      await navigator.share({ title: `Timeplan for ${displayName}`, url });
    } catch {
      // Avbrutt av bruker – ikke en feil
    }
  }

  return (
    <>
      {open && <div className="share-backdrop" onClick={handleClose} aria-hidden="true" />}
      <div className={`edit-modal share-modal${open ? ' active' : ''}`} id="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
        <h2 id="share-modal-title" style={{ marginTop: 0, fontSize: '1.2rem' }}>
          Del timeplanen for «{displayName}»
        </h2>
        <p className="modal-help">
          Alle som åpner lenken – elever, kolleger eller en vikar – får timeplan, pauser og fagfarger
          på sin egen skjerm med ett trykk. Lenken er et øyeblikksbilde: del den på nytt når du har
          gjort endringer. Agenda, notater og nedtellinger deles ikke.
        </p>

        {error && <p className="modal-error">{error}</p>}

        {!error && url && !tooLongForQr && (
          <div className="share-qr-wrap">
            <div className="share-qr-frame">
              <canvas ref={canvasRef} className="share-qr" aria-label="QR-kode med delingslenke" />
            </div>
            <button type="button" className="neumorphic-btn" onClick={() => setBigQr(true)}>
              ⤢ Vis stor på tavla
            </button>
          </div>
        )}

        {!error && url && (tooLongForQr || url.length > SHARE_URL_SOFT_LIMIT) && (
          <p className="modal-note">
            Denne timeplanen gir en lang lenke. Kopier lenken og del den i Teams eller på e-post
            {tooLongForQr ? ' – den er for lang for en QR-kode.' : '.'}
          </p>
        )}

        {!error && (
          <div className="share-url-row">
            <input
              ref={inputRef}
              type="text"
              readOnly
              value={url}
              aria-label="Delingslenke"
              onFocus={e => e.target.select()}
            />
          </div>
        )}

        <div className="modal-actions">
          {!error && (
            <button ref={copyBtnRef} type="button" className="neumorphic-btn primary" onClick={copyLink}>
              {copied ? '✓ Kopiert' : 'Kopier lenke'}
            </button>
          )}
          {!error && canShare && (
            <button type="button" className="neumorphic-btn" onClick={shareLink}>Del …</button>
          )}
          <button type="button" className="neumorphic-btn" onClick={handleClose}>Lukk</button>
        </div>
      </div>

      {open && bigQr && url && (
        <div className="share-qr-big" onClick={() => setBigQr(false)} role="dialog" aria-label="Stor QR-kode">
          <h2 className="share-qr-big-title">Skann for å få timeplanen for «{displayName}»</h2>
          <canvas ref={bigCanvasRef} aria-label="QR-kode med delingslenke" />
          <p className="share-qr-big-hint">Trykk hvor som helst for å lukke</p>
        </div>
      )}
    </>
  );
}
