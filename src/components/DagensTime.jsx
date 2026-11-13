import { useEffect, useRef, useState } from 'react';
import Dialog from './Dialog.jsx';
import Info from './Info.jsx';
import Ikon, { FagSymbol } from './Ikon.jsx';
import { getMinutesFromTime, formatMinutesAsTime } from '../utils/time.js';
import { tolkKlokkeslett, dagensDato, timeStatus, timeTittel, VIS_FOER_START } from '../hooks/useDagensTime.js';
import { getReadableAgendaTextColor } from '../utils/color.js';
import { erElev, skoleTjeneste } from '../utils/ksTjeneste.js';

/* «Agenda for timen»: kortet på tavla (glass, for elevene) og dialogen der
   læreren setter den opp (instrument). Rask vei: faget og tiden hentes fra
   timeplanen, så læreren bare skriver punktene. Full vei: tittel, tid og mål.
   Hvert fag kan ha en mal som hentes med ett trykk. */

/** Lite fagmerke med symbol og fagfarge, som på «Akkurat nå» */
function FagMerke({ merke, className = '' }) {
  if (!merke) return null;
  const stil = merke.farge ? { background: merke.farge, color: getReadableAgendaTextColor(merke.farge) } : undefined;
  return (
    <span className={`dt-fagmerke${merke.farge ? '' : ' is-noytral'} ${className}`.trim()} style={stil} aria-hidden="true">
      <FagSymbol verdi={merke.symbol} reserve="book-open" />
    </span>
  );
}

// ─── Kortet elevene ser ─────────────────────────────────────────────────────

export function DagensTimeKort({ time, minutter, merke, onEndre, onSkjul, onVekslePunkt }) {
  const { status, naaIndex, framdrift } = timeStatus(time, minutter);
  const mangePunkter = time.punkter.length > 4;
  const tittel = timeTittel(time);

  return (
    <div className="container dagens-time" id="main-container" aria-live="polite">
      <div className="dt-verktoy">
        <button type="button" className="dt-knapp" onClick={onEndre} aria-label="Endre agendaen" title="Endre agendaen">
          <Ikon navn="pencil" />
        </button>
        <button type="button" className="dt-knapp" onClick={onSkjul} aria-label="Skjul timen fra tavla" title="Skjul fra tavla">
          <Ikon navn="x" />
        </button>
      </div>

      <div className="dt-topp">
        {tittel && (
          <h1 className="dt-tittel">
            {!time.tittel?.trim() && <FagMerke merke={merke} />}
            {tittel}
          </h1>
        )}
        <div className="dt-tid">
          <span className="dt-klokke">{time.fra}–{time.til}</span>
          {status && <span className="dt-status">{status}</span>}
        </div>
      </div>
      {framdrift !== null && (
        <div className="dt-framdrift" aria-hidden="true"><span style={{ width: `${framdrift}%` }} /></div>
      )}

      {time.maal && (
        <div className="dt-maal">
          <span className="dt-maal-merke"><Ikon navn="target" /> Mål</span>
          <span className="dt-maal-tekst">{time.maal}</span>
        </div>
      )}

      {time.punkter.length > 0 && (
        <ol className={`dt-agenda${mangePunkter ? ' er-mange' : ''}`}>
          {time.punkter.map((p, i) => (
            <li key={i} className={`${p.ferdig ? 'er-ferdig' : ''}${i === naaIndex ? ' er-naa' : ''}`.trim() || undefined}>
              <button
                type="button"
                className="dt-punkt"
                onClick={() => onVekslePunkt(i)}
                aria-pressed={p.ferdig ? 'true' : 'false'}
                title={p.ferdig ? 'Marker som ikke ferdig' : 'Marker som ferdig'}
              >
                <span className="dt-nr">{p.ferdig ? <Ikon navn="check" strek={3} /> : i + 1}</span>
                <span className="dt-punkt-tekst">{p.tekst}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Dialogen læreren fyller ut ─────────────────────────────────────────────

function PlanleggTimeInner({
  eksisterende, forslag, fagVed, minutter, dag, maler, merkeFor, editPermission,
  onLagre, onLagreMal, onSlett, onAvbryt,
}) {
  // Faget følger starttiden: endrer læreren tiden til en annen time, byttes
  // faget (og malen) til den timen
  const [{ fag, fagNokkel }, setFagInfo] = useState(() => (eksisterende
    ? { fag: eksisterende.fag || '', fagNokkel: eksisterende.fagNokkel || '' }
    : { fag: forslag.fag || '', fagNokkel: forslag.fagNokkel || '' }));
  const merke = merkeFor?.(fagNokkel) || null;
  const mal = fagNokkel ? maler?.[fagNokkel] : null;
  // Rask vei: ny agenda i en time fra timeplanen. Da står faget og tiden på én
  // linje, og markøren står i første punkt. Bestemmes én gang, når dialogen åpnes.
  const [rask] = useState(() => !eksisterende && !!forslag.fag);

  const [utvidet, setUtvidet] = useState(!rask);
  const [visMaal, setVisMaal] = useState(!rask || !!eksisterende?.maal);
  const [tittel, setTittel] = useState(eksisterende?.tittel || '');
  const [fra, setFra] = useState(eksisterende?.fra || forslag.fra);
  const [til, setTil] = useState(eksisterende?.til || forslag.til);
  const [maal, setMaal] = useState(eksisterende?.maal || '');
  const [punkter, setPunkter] = useState(() => {
    const p = eksisterende?.punkter?.map(x => x.tekst) || [];
    return p.length ? p : [''];
  });
  const [tilRort, setTilRort] = useState(!!eksisterende);
  const [visFeil, setVisFeil] = useState(false);
  const [malMelding, setMalMelding] = useState('');

  const tittelRef = useRef(null);
  const fraRef = useRef(null);
  const tilRef = useRef(null);
  const maalRef = useRef(null);
  const punktRefs = useRef([]);
  const fokusPunkt = useRef(null);
  const fokusFelt = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const el = rask ? punktRefs.current[0] : tittelRef.current;
      el?.focus();
      el?.select?.();
    }, 50);
    return () => clearTimeout(id);
  }, [rask]);

  // Etter at et punkt er lagt til eller fjernet: fokus dit læreren skriver
  useEffect(() => {
    if (fokusPunkt.current == null) return;
    const el = punktRefs.current[fokusPunkt.current];
    fokusPunkt.current = null;
    if (el) {
      el.focus();
      const len = el.value.length;
      try { el.setSelectionRange(len, len); } catch { /* ikke alle felt kan markeres */ }
    }
  }, [punkter]);

  // Et felt som nettopp ble vist (Endre, + Læringsmål), får fokus
  useEffect(() => {
    const el = fokusFelt.current?.current;
    fokusFelt.current = null;
    el?.focus();
  }, [utvidet, visMaal]);

  const fraOk = tolkKlokkeslett(fra);
  const tilOk = tolkKlokkeslett(til);
  const start = fraOk ? getMinutesFromTime(fraOk) : null;
  const slutt = tilOk ? getMinutesFromTime(tilOk) : null;
  const varighet = start != null && slutt != null ? slutt - start : null;
  const tidOk = varighet != null && varighet > 0;
  const rensedePunkter = punkter.map(p => p.trim()).filter(Boolean);
  const harInnhold = !!(tittel.trim() || maal.trim() || rensedePunkter.length);
  const kanLagre = tidOk && harInnhold;

  let tidFeil = '';
  if (!fraOk) tidFeil = 'Skriv starttid som 10:00 (eller bare 1000).';
  else if (!tilOk) tidFeil = 'Skriv sluttid som 10:45 (eller bare 1045).';
  else if (!tidOk) tidFeil = 'Timen må slutte etter at den starter.';

  // Sluttiden følger starttiden (samme lengde) til læreren endrer den selv
  function endreFra(v) {
    setFra(v);
    const ny = tolkKlokkeslett(v);
    if (ny && fagVed) setFagInfo(fagVed(getMinutesFromTime(ny)));
    if (tilRort) return;
    const gammelStart = tolkKlokkeslett(fra);
    const gammelSlutt = tolkKlokkeslett(til);
    if (!ny) return;
    const lengde = gammelStart && gammelSlutt
      ? Math.max(5, getMinutesFromTime(gammelSlutt) - getMinutesFromTime(gammelStart))
      : 45;
    const s = getMinutesFromTime(ny) + lengde;
    if (s < 24 * 60) setTil(formatMinutesAsTime(s));
  }

  // Pent format når feltet forlates: «1000» blir «10:00»
  function pyntTid(v, sett) {
    const t = tolkKlokkeslett(v);
    if (t) sett(t);
  }

  function lagre(fest) {
    if (!kanLagre) {
      setVisFeil(true);
      // Feil i tiden kan bare rettes når tidsfeltene vises
      if (!tidOk) setUtvidet(true);
      return;
    }
    onLagre({
      id: eksisterende?.id || null, // ny time får id når den lagres
      dato: dagensDato(),
      dag,
      tittel: tittel.trim(),
      fag,
      fagNokkel,
      fra: fraOk,
      til: tilOk,
      maal: maal.trim(),
      punkter: rensedePunkter.map((tekst) => {
        const gammel = eksisterende?.punkter?.find(x => x.tekst === tekst);
        return { tekst, ferdig: !!gammel?.ferdig };
      }),
      fast: fest,
      fastVed: fest ? minutter : null,
      skjult: false,
    });
  }

  function hurtigLagre(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      lagre(true);
      return true;
    }
    return false;
  }

  function videreMedEnter(e, neste) {
    if (hurtigLagre(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      neste?.current?.focus();
      neste?.current?.select?.();
    }
  }

  function endrePunkt(i, v) {
    // Lim inn flere linjer: ett punkt per linje
    if (v.includes('\n')) {
      const linjer = v.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      setPunkter(prev => {
        const neste = [...prev];
        neste.splice(i, 1, ...linjer);
        fokusPunkt.current = i + linjer.length - 1;
        return neste.length ? neste : [''];
      });
      return;
    }
    setPunkter(prev => prev.map((p, j) => (j === i ? v : p)));
  }

  function leggTilPunkt(etter) {
    setPunkter(prev => {
      const neste = [...prev];
      neste.splice(etter + 1, 0, '');
      fokusPunkt.current = etter + 1;
      return neste;
    });
  }

  function fjernPunkt(i) {
    setPunkter(prev => {
      if (prev.length <= 1) { fokusPunkt.current = 0; return ['']; }
      fokusPunkt.current = Math.max(0, i - 1);
      return prev.filter((_, j) => j !== i);
    });
  }

  function punktTast(e, i) {
    if (hurtigLagre(e)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!punkter[i].trim()) return;
      leggTilPunkt(i);
    } else if (e.key === 'Backspace' && !punkter[i] && punkter.length > 1) {
      e.preventDefault();
      fjernPunkt(i);
    }
  }

  function limInn(e, i) {
    const tekst = e.clipboardData?.getData('text') || '';
    if (!tekst.includes('\n')) return;
    e.preventDefault();
    const foran = punkter[i] ? `${punkter[i]}\n` : '';
    endrePunkt(i, foran + tekst);
  }

  function visFelt(ref, sett) {
    fokusFelt.current = ref;
    sett(true);
  }

  // ── Malen for faget ──
  const malPunkter = mal?.punkter || [];
  const punkterLikMal = !!mal && malPunkter.join('\n') === rensedePunkter.join('\n');
  const likMal = punkterLikMal && (mal.maal || '') === maal.trim();
  const visBrukMal = !!mal && malPunkter.length > 0 && !punkterLikMal;
  const elevmodus = !!skoleTjeneste() && erElev();

  function brukMal() {
    if (rensedePunkter.length && !confirm(`Erstatte punktene du har skrevet med malen for ${fag}?`)) return;
    setPunkter(malPunkter.length ? [...malPunkter] : ['']);
    if (mal.maal && !maal.trim()) {
      setMaal(mal.maal);
      setVisMaal(true);
    }
    fokusPunkt.current = Math.max(0, malPunkter.length - 1);
    setMalMelding('');
  }

  function lagreMal() {
    if (!editPermission || !rensedePunkter.length) return;
    if (mal && !confirm(`Erstatte malen for ${fag}?`)) return;
    onLagreMal(fagNokkel, { maal: maal.trim(), punkter: rensedePunkter });
    setMalMelding(`Lagret som mal for ${fag}. Neste gang henter du den med ett trykk.`);
  }

  const naa = minutter;
  const passert = slutt != null && naa >= slutt;
  const langtFram = start != null && naa < start - VIS_FOER_START;

  return (
    <Dialog onClose={onAvbryt} title={eksisterende ? 'Endre agendaen' : 'Agenda for timen'} className="k-dialog--time" bred>
      {!utvidet ? (
        <div className="dt-sammendrag">
          <FagMerke merke={merke || { symbol: null, farge: null }} />
          <span className="dt-sammendrag-fag">{fag}</span>
          <span className="dt-sammendrag-tid">{fraOk || fra}–{tilOk || til}</span>
          <button
            type="button"
            className="k-btn k-btn--liten dt-sammendrag-endre"
            id="time-endre"
            onClick={() => visFelt(tittelRef, setUtvidet)}
          ><Ikon navn="pencil" /> Endre</button>
        </div>
      ) : (
        <>
          <Info>Vises stort på tavla. Gjelder i dag, på denne skjermen.</Info>

          <label className="k-field">
            <span>Tittel</span>
            <input
              ref={tittelRef}
              type="text"
              id="time-tittel"
              className="k-input k-input--stor"
              placeholder={fag ? `${fag} (eller for eksempel «${fag} – tema»)` : 'For eksempel «Matematikk – brøk»'}
              value={tittel}
              onChange={e => setTittel(e.target.value)}
              onKeyDown={e => videreMedEnter(e, fraRef)}
              autoComplete="off"
            />
          </label>

          <div className="dt-tidsrad">
            <label className="k-field dt-tidsfelt">
              <span>Fra</span>
              <input
                ref={fraRef}
                type="text"
                id="time-fra"
                className="k-input k-input--stor dt-tid-input"
                inputMode="numeric"
                placeholder="10:00"
                maxLength={5}
                value={fra}
                onFocus={e => e.target.select()}
                onChange={e => endreFra(e.target.value)}
                onBlur={e => pyntTid(e.target.value, setFra)}
                onKeyDown={e => videreMedEnter(e, tilRef)}
                aria-invalid={visFeil && !fraOk ? true : undefined}
                autoComplete="off"
              />
            </label>
            <span className="dt-tidsstrek" aria-hidden="true">–</span>
            <label className="k-field dt-tidsfelt">
              <span>Til</span>
              <input
                ref={tilRef}
                type="text"
                id="time-til"
                className="k-input k-input--stor dt-tid-input"
                inputMode="numeric"
                placeholder="10:45"
                maxLength={5}
                value={til}
                onFocus={e => e.target.select()}
                onChange={e => { setTil(e.target.value); setTilRort(true); }}
                onBlur={e => pyntTid(e.target.value, setTil)}
                onKeyDown={e => videreMedEnter(e, visMaal ? maalRef : { current: punktRefs.current[0] })}
                aria-invalid={visFeil && !tidOk ? true : undefined}
                autoComplete="off"
              />
            </label>
            <span className="dt-varighet" aria-live="polite">{tidOk ? `${varighet} min` : ''}</span>
          </div>
          {tidFeil && (visFeil || (fra && til && fra.length >= 4 && til.length >= 4)) && (
            <p className="k-feil" role="alert">{tidFeil}</p>
          )}
        </>
      )}

      {(visMaal || utvidet) && (
        <label className="k-field">
          <span>Læringsmål</span>
          <input
            ref={maalRef}
            type="text"
            id="time-maal"
            className="k-input k-input--stor"
            placeholder="For eksempel «Jeg kan sammenligne brøker»"
            value={maal}
            onChange={e => setMaal(e.target.value)}
            onKeyDown={e => videreMedEnter(e, { current: punktRefs.current[0] })}
            autoComplete="off"
          />
        </label>
      )}

      <div className="k-field">
        <span id="time-agenda-tittel">Agenda <span className="dt-hint">Enter gir nytt punkt</span></span>
        {visBrukMal && (
          <button type="button" className="k-btn k-btn--rediger dt-bruk-mal" id="time-bruk-mal" onClick={brukMal}>
            <Ikon navn="clipboard-list" /> Bruk malen for {fag}
            {malPunkter.length > 0 && <span className="dt-bruk-mal-antall"> ({malPunkter.length} {malPunkter.length === 1 ? 'punkt' : 'punkter'})</span>}
          </button>
        )}
        <ol className="dt-punktliste" aria-labelledby="time-agenda-tittel">
          {punkter.map((p, i) => (
            <li key={i} className="dt-punktrad">
              <span className="dt-punktnr" aria-hidden="true">{i + 1}</span>
              <input
                ref={el => { punktRefs.current[i] = el; }}
                type="text"
                className="k-input"
                id={i === 0 ? 'time-punkt-1' : undefined}
                aria-label={`Punkt ${i + 1}`}
                placeholder={i === 0 ? 'For eksempel «Oppstart»' : 'Neste punkt'}
                value={p}
                onChange={e => endrePunkt(i, e.target.value)}
                onKeyDown={e => punktTast(e, i)}
                onPaste={e => limInn(e, i)}
                autoComplete="off"
              />
              {(punkter.length > 1 || p) && (
                <button type="button" className="k-close dt-fjern" aria-label={`Fjern punkt ${i + 1}`} onClick={() => fjernPunkt(i)}>
                  <Ikon navn="x" />
                </button>
              )}
            </li>
          ))}
        </ol>
        <div className="dt-tillegg">
          <button type="button" className="k-btn k-btn--ny k-btn--liten dt-nytt-punkt" onClick={() => leggTilPunkt(punkter.length - 1)}>
            <Ikon navn="plus" /> Nytt punkt
          </button>
          {!visMaal && !utvidet && (
            <button type="button" className="k-btn k-btn--liten dt-vis-maal" id="time-vis-maal" onClick={() => visFelt(maalRef, setVisMaal)}>
              <Ikon navn="target" /> Læringsmål
            </button>
          )}
        </div>
      </div>

      {visFeil && !harInnhold && <p className="k-feil" role="alert">Skriv minst ett agendapunkt (eller et mål).</p>}
      {passert && tidOk && (
        <Info>Tiden er passert i dag. Agendaen står på tavla til du skjuler den.</Info>
      )}

      <div className="k-dialog-actions">
        <button type="button" id="time-vis" className="k-btn k-btn--ny k-btn--fylt" onClick={() => lagre(true)}>
          <Ikon navn="check" /> Vis på tavla
        </button>
        {langtFram && tidOk && (
          <button type="button" id="time-lagre-senere" className="k-btn k-btn--tilbake" onClick={() => lagre(false)}>
            Vis først kl. {formatMinutesAsTime(start - VIS_FOER_START)}
          </button>
        )}
        <button type="button" className="k-btn k-btn--tilbake" onClick={onAvbryt}>Avbryt</button>
        {eksisterende && (
          <button type="button" className="k-btn k-btn--slett" onClick={() => { if (confirm('Slette agendaen?')) onSlett(eksisterende.id); }}>
            Slett
          </button>
        )}
      </div>

      {fagNokkel && (
        <div className="dt-mal-rad">
          <button
            type="button"
            className="k-btn k-btn--liten dt-lagre-mal"
            id="time-lagre-mal"
            disabled={!editPermission || !rensedePunkter.length || likMal}
            onClick={lagreMal}
          ><Ikon navn="download" /> Lagre som mal for {fag}</button>
          <span className="dt-mal-hint" role="status">
            {malMelding || (!editPermission
              ? (elevmodus
                ? 'Logg inn som lærer i «Klasse og timeplan» for å lagre maler.'
                : 'Trykk «Lås opp» i «Klasse og timeplan» for å lagre maler.')
              : (likMal ? 'Agendaen er lik malen.' : ''))}
          </span>
        </div>
      )}
    </Dialog>
  );
}

export function PlanleggTimeDialog(props) {
  return props.open ? <PlanleggTimeInner {...props} /> : null;
}
