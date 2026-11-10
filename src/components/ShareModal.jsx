import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Dialog from './Dialog.jsx';
import Info from './Info.jsx';
import {
  buildSharePayload,
  encodeSharePayload,
  validateSharePayload,
  buildShareUrl,
  SHARE_URL_SOFT_LIMIT,
} from '../utils/share.js';
import Ikon from './Ikon.jsx';

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

  // Escape lukker først den store QR-koden; dialogen selv håndterer Escape ellers
  useEffect(() => {
    if (!open || !bigQr) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setBigQr(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, bigQr]);

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
      <Dialog open={open} onClose={handleClose} laast={bigQr} title={`Del timeplanen for «${displayName}»`} titleId="share-modal-title" className="share-modal">
        <Info>
          Alle som åpner lenken får timeplan, pauser og fagfarger på sin egen skjerm med ett trykk.
          Lenken er et øyeblikksbilde: del den på nytt etter endringer. Agenda, notater og «Dager til» følger ikke med.
        </Info>

        {error && <p className="k-feil" role="alert">{error}</p>}

        {!error && url && !tooLongForQr && (
          <div className="share-qr-wrap">
            <div className="share-qr-frame">
              <canvas ref={canvasRef} className="share-qr" aria-label="QR-kode med delingslenke" />
            </div>
            <button type="button" className="k-btn k-btn--hjelp k-btn--liten" onClick={() => setBigQr(true)}>
              <Ikon navn="maximize" /> Vis stor på tavla
            </button>
          </div>
        )}

        {!error && url && (tooLongForQr || url.length > SHARE_URL_SOFT_LIMIT) && (
          <p className="k-dialog-tekst is-dempet">
            Denne timeplanen gir en lang lenke. Kopier lenken og del den i Teams eller på e-post
            {tooLongForQr ? '. Den er for lang for en QR-kode.' : '.'}
          </p>
        )}

        {!error && (
          <label className="k-field">
            <span>Lenke</span>
            <input
              ref={inputRef}
              type="text"
              className="k-input k-input--mono"
              readOnly
              value={url}
              aria-label="Delingslenke"
              onFocus={e => e.target.select()}
            />
          </label>
        )}

        <div className="k-dialog-actions">
          {!error && (
            <button ref={copyBtnRef} type="button" className="k-btn k-btn--ny k-btn--fylt" onClick={copyLink}>
              <Ikon navn={copied ? 'check' : 'link'} /> {copied ? 'Kopiert' : 'Kopier lenke'}
            </button>
          )}
          {!error && canShare && (
            <button type="button" className="k-btn k-btn--hjelp" onClick={shareLink}>Del …</button>
          )}
          <button type="button" className="k-btn k-btn--tilbake" onClick={handleClose}>Lukk</button>
        </div>
      </Dialog>

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
