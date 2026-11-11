import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { aktivSkole } from '../data/skoletema.js';
import { skoleFerier } from '../data/skoler/index.js';
import { bursdagerPaaDag, bursdagUndertekst, bursdagSetning, lagErFridag, osloIDag } from '../utils/bursdager.js';
import {
  skoleTjeneste,
  hentBursdager,
  trengerNyListe,
  lyttTilTjeneste,
  lesTjenesteTilstand,
  startTjenesteTilstand,
  SPRUKKET_KEY,
} from '../utils/ksTjeneste.js';
import { safeGetItem, safeSetItem } from '../utils/storage.js';

const SJEKK_HVER_MS = 60 * 60 * 1000;

function lesSprukket() {
  try {
    const s = JSON.parse(safeGetItem(SPRUKKET_KEY) || 'null');
    return s && Array.isArray(s.nokler) ? s : { dag: null, nokler: [] };
  } catch {
    return { dag: null, nokler: [] };
  }
}

/**
 * Bursdagene som skal feires i dag for klassene som vises.
 * Henter lista fra skolens tjeneste når den er eldre enn et døgn
 * (sjekkes hver time, så en veggskjerm som står på i ukevis følger med).
 * Svarer { bursdager, sprekk(nokkel) }; en sprukket ballong er borte resten av dagen.
 */
export default function useBursdager(klassenavn) {
  const tjeneste = useMemo(() => skoleTjeneste(), []);
  const { bursdager: liste } = useSyncExternalStore(lyttTilTjeneste, lesTjenesteTilstand);

  useEffect(() => {
    if (!tjeneste) return undefined;
    startTjenesteTilstand();
    const sjekk = () => { if (trengerNyListe()) hentBursdager(tjeneste); };
    sjekk();
    const id = setInterval(sjekk, SJEKK_HVER_MS);
    return () => clearInterval(id);
  }, [tjeneste]);

  const idag = osloIDag();
  // Sprukne ballonger gjelder bare dagen de ble sprukket
  const [sprukketLagret, setSprukket] = useState(lesSprukket);
  const sprukket = useMemo(() => (sprukketLagret.dag === idag ? sprukketLagret.nokler : []), [sprukketLagret, idag]);

  const erFridag = useMemo(() => lagErFridag(skoleFerier(aktivSkole()?.id)), []);
  const nokkel = (klassenavn || []).join('|');

  const alle = useMemo(() => {
    const klasser = liste?.data?.klasser;
    if (!tjeneste || !klasser) return [];
    const sett = new Set();
    const ut = [];
    for (const klasse of nokkel ? nokkel.split('|') : []) {
      for (const b of bursdagerPaaDag(klasser[klasse], idag, erFridag)) {
        // Datoen er med, så to elever med samme fornavn i klassen holdes fra hverandre
        const id = `${klasse}:${b.fornavn}:${b.bursdag}`;
        if (sett.has(id)) continue;
        sett.add(id);
        ut.push({ ...b, klasse, nokkel: id, undertekst: bursdagUndertekst(b), setning: bursdagSetning(b) });
      }
    }
    return ut;
  }, [tjeneste, liste, nokkel, idag, erFridag]);

  const sprekk = useCallback((id) => {
    setSprukket(prev => {
      const iDag = prev.dag === idag ? prev.nokler : [];
      const neste = { dag: idag, nokler: iDag.includes(id) ? iDag : [...iDag, id] };
      safeSetItem(SPRUKKET_KEY, JSON.stringify(neste));
      return neste;
    });
  }, [idag]);

  const bursdager = useMemo(() => alle.filter(b => !sprukket.includes(b.nokkel)), [alle, sprukket]);
  return { bursdager, sprekk };
}
