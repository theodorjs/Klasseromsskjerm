import { useEffect, useRef, useState } from 'react';

/** Hvor lenge knappene står fullt ut før de krymper første gang. */
export const ROLIG_FORSTE_MS = 4500;
/** Hvor lenge de står fullt ut etter at noen har rørt mus, skjerm eller tastatur. */
export const ROLIG_ETTER_MS = 2500;

/**
 * Knapper som starter fullt ut med tekst og krymper til bare symbolet
 * når ingen rører mus, skjerm eller tastatur. Brukes av Tilbake i
 * «Vis for klassen», Avslutt på veggskjermen og Verktøy.
 *
 * Med `aktiv: false` står knappen i ro; idet den blir aktiv, starter den
 * fullt ut på nytt (for knapper i et panel som åpnes og lukkes).
 *
 * `bareVisFoerst(onClick)` gir knappe-props for en knapp som avslutter noe:
 * er den krympet og trykkes med en finger, vises den bare. Med mus eller
 * tastatur virker den med en gang.
 */
export default function useRolig({ forsteMs = ROLIG_FORSTE_MS, synligMs = ROLIG_ETTER_MS, aktiv = true } = {}) {
  const [synlig, setSynlig] = useState(true);
  const synligRef = useRef(true);
  const ignorerKlikk = useRef(false);

  // Når knappen kommer til syne (aktiv blir sann), starter den fullt ut igjen
  useEffect(() => {
    if (!aktiv) return undefined;
    let timer = null;
    function vis(ms) {
      synligRef.current = true;
      setSynlig(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { synligRef.current = false; setSynlig(false); }, ms);
    }
    const naarNoenRorer = () => vis(synligMs);
    vis(forsteMs);
    window.addEventListener('pointermove', naarNoenRorer);
    window.addEventListener('pointerdown', naarNoenRorer);
    window.addEventListener('keydown', naarNoenRorer);
    return () => {
      window.removeEventListener('pointermove', naarNoenRorer);
      window.removeEventListener('pointerdown', naarNoenRorer);
      window.removeEventListener('keydown', naarNoenRorer);
      if (timer) clearTimeout(timer);
    };
  }, [forsteMs, synligMs, aktiv]);

  function bareVisFoerst(onClick) {
    return {
      onPointerDown: (e) => {
        // Lytteren på vinduet kjører etter denne, så synligRef viser tilstanden før trykket
        ignorerKlikk.current = !synligRef.current && e.pointerType === 'touch';
      },
      onClick: (e) => {
        // preventDefault: virker også for lenker, som ellers ville navigert
        if (ignorerKlikk.current) { ignorerKlikk.current = false; e.preventDefault(); return; }
        onClick?.(e);
      },
    };
  }

  return { synlig, bareVisFoerst };
}
