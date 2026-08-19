# PRD – Klasseromsskjerm

| | |
|---|---|
| **Produkt** | Klasseromsskjerm |
| **Dokumenttype** | Product Requirements Document (PRD) |
| **Versjon** | 0.1 – Utkast |
| **Dato** | 2. juli 2026 |
| **Eier** | Theodor Sandaker |
| **Status** | Til gjennomgang |

---

## 1. Sammendrag (Executive Summary)

Klasseromsskjerm er en visuell informasjonsskjerm for klasserom, laget for norske lærere.
Den viser hva som skjer «akkurat nå», hvor lang tid det er igjen av timen, dagens
timeplan som en fargelagt tidslinje, samt verktøy som timer, nedtellinger, agenda og notater.

I dag er produktet en gratis, enkeltbruker-nettapp (React + Vite) som kjører lokalt i
nettleseren og lagrer data på den enkelte enheten. Den er publisert via GitHub Pages.

**Ambisjonen** er å utvikle Klasseromsskjerm slik at:

1. **Alle klasserom på alle skoler** i Norge kan ta den i bruk hvis de ønsker det.
2. Produktet på sikt kan **selges til Udir (Utdanningsdirektoratet)** for distribusjon til
   og bruk i offentlige skoler over hele landet.

Dette dokumentet beskriver dagens produkt, brukerne, og en faseinndelt vei fra dagens
MVP til et nasjonalt, innkjøpsklart og regelverksmessig kompatibelt produkt.

---

## 2. Visjon og mål

### 2.1 Visjon
> Hvert klasserom i Norge har en rolig, tydelig og pedagogisk skjerm som gir elever og
> lærere felles oversikt over dagen – uten distraksjoner, uten personvernrisiko, og
> tilgjengelig for alle.

### 2.2 Produktmål
- **Redusere «hva skjer nå / hvor lenge igjen»-spørsmål** i klasserommet.
- Gi elever **forutsigbarhet og struktur** (særlig verdifullt for elever med behov for tydelige rammer).
- Gi læreren **lav-friksjons verktøy** (timer, agenda, nedtelling) uten å bytte app eller fane.
- Være **universelt utformet** og trygt å bruke i offentlig skole.

### 2.3 Forretningsmål (langsiktig)
- Bygge et produkt som **teknisk og juridisk** kan skaleres til multi-skole SaaS.
- Oppnå **innkjøpsklarhet** for offentlig sektor (UU, personvern, Feide, databehandleravtale).
- Etablere en **distribusjonsavtale eller anskaffelse via Udir** eller rammeavtale.

### 2.4 Ikke-mål (Non-Goals)
Denne fasen skal **ikke**:
- Være et fullverdig LMS (læringsplattform) som Its Learning / Canvas / Google Classroom.
- Håndtere karakterer, fravær eller sensitive elevopplysninger.
- Erstatte skolens administrative timeplansystem (Visma InSchool, IST, TimeEdit) – men gjerne
  integrere mot dem senere.

### 2.5 Produktprinsipper (byggefilosofi)

> **Rekkefølge:** Et bunnsolid produkt kommer først. Prising, salg og go-to-market (kapittel 12
> og 14) er bevisst **nedprioritert** til produktet er stabilt, fleksibelt og intuitivt nok til å
> stå på egne ben. Disse tre pilarene styrer all prioritering i inneværende fase.

**Pilar 1 – Stabilt: «null datatap, aldri hvit skjerm».**
De to katastrofene for en lærer er at oppsettet forsvinner, eller at skjermen krasjer foran
klassen. Alt vi bygger skal måles mot disse:
- Ingen datatap: robust lokal lagring, backup/eksport, trygge datamigreringer *før* sky-synk.
- Ingen krasj i visning: *error boundaries* slik at én feil aldri gir blank skjerm.
- Tåler hele skoledager uten manuell oppdatering, og et midlertidig nettbrudd.

**Pilar 2 – Fleksibelt: «skolen former verktøyet, ikke omvendt».**
«Alle skoler» krever at skoledagens *struktur* er fritt konfigurerbar – ikke bare tidene i én
fast mal, men antall økter, pauselengder og ulik dagsrytme per dag/skole. Fådelte klasser,
fagfarger og temaer er allerede fleksible; dagsstrukturen må bli det.

**Pilar 3 – Intuitivt: «i gang på 2 minutter, men tåler dybde».**
Skal fungere for både den teknologiinteresserte og den slitne læreren som snart pensjoneres.
Spenningen mot Pilar 2 (mer fleksibilitet = mer kompleksitet) løses med:
- **Gode standarder:** appen gjør noe nyttig umiddelbart, uten oppsett.
- **Progressiv avdekking:** dybde og konfigurasjon er tilgjengelig, men aldri i veien.
- **Tilgivende design:** vanskelig å ødelegge, lett å angre.

#### Konkrete gap i dagens produkt (mot pilarene)
| Gap | Pilar | Status |
|---|---|---|
| Data kun i `localStorage`, ingen backup/eksport → datataps­risiko | 1 | Åpent |
| Ingen *error boundary* → hvit skjerm ved komponentfeil | 1 | Åpent |
| Skoledags­struktur (`SCHOOL_DAY_FRAMES`) er en låst mal | 2 | Åpent |
| Ingen førstegangs­opplevelse / veiledning for ny lærer | 3 | Åpent |

---

## 3. Problemstilling

**For læreren:** Å holde oversikt over timeplan, pauser, tid igjen av økten og dagens
gjøremål krever i dag ofte flere verktøy (tavle, mobil-timer, post-it, LMS). Det er
fragmentert og stjeler oppmerksomhet fra undervisningen.

**For elevene:** Mange elever – særlig yngre og elever med tilretteleggingsbehov – har nytte
av en fast, visuell representasjon av dagen. «Hvor lenge til friminutt?» er et konstant spørsmål.

**For skolen:** Eksisterende digitale skjermløsninger er ofte dyre, generiske
(reklame/infoskjerm-programvare) eller ikke laget for norsk skolehverdag og norsk timeplanstruktur
(økter, storefri, fådelte klasser).

---

## 4. Målgrupper og personas

| Persona | Rolle | Behov | Fase der de blir viktige |
|---|---|---|---|
| **Læreren (primærbruker)** | Setter opp timeplan, styrer skjermen i timen | Rask oppsett, pålitelig visning, verktøy for hånden | Fase 0 → |
| **Elevene (passive seere)** | Ser skjermen | Tydelig «nå», tid igjen, dagens plan | Fase 0 → |
| **Vikaren** | Overtar en klasse midlertidig | Se en klasses plan uten eget oppsett | Fase 1–2 |
| **Rektor / skoleadmin** | Administrerer skolens klasser og lærere | Oversikt, standardisering, enkel utrulling | Fase 2 |
| **IT-ansvarlig (kommune/skole)** | Utrulling, enheter, pålogging, sikkerhet | Feide, MDM/enhetsstyring, sikkerhetsvurdering (ROS), UU-dokumentasjon | Fase 2–4 |
| **Innkjøper / Udir** | Vurderer for nasjonal anskaffelse | UU-samsvar, personvern, pris, pedagogisk verdi, drift/SLA | Fase 3–4 |

---

## 5. Nåværende produkt (Fase 0 – MVP)

Dette er implementert og i drift i dag.

### 5.1 Kjernevisning
- **«Akkurat nå»-kort**: viser gjeldende time/aktivitet basert på timeplan og sanntidsklokke (Europe/Oslo).
- **Nedtelling**: dynamisk tekst, f.eks. «Det er 23 min. igjen av timen» / «Neste pause begynner om …» / «Skoledagen begynner om …».
- **Tidslinje**: fargelagte blokker for dagens økter og pauser, med markør for nåtid og detaljer ved hover.
- **Statuslinje**: ukenummer (ISO), ukedag, dato og klokke.
- **Helg/etter skoletid**: egne tilstander («Endelig helg!», «Skoledagen er over!»).

### 5.2 Verktøykasse
- **Timer** med grafisk SVG-ring og valgbar fargegradient.
- **Nedtellinger** til datoer/hendelser (maks 3 per klasse, med klokkeslett).
- **Agenda**: gjøremålsliste per fag, drag-and-drop, emojier, ferdig-markering, maler.
- **Notat**: flyttbart notatpanel med enkel tekstformatering (fet/kursiv/understrek).
- **Velg tid** (tidssimulering): overstyr dag/klokke for planlegging og testing.
- **Tema**: fire moduser – stjerne, mørk, lys og fargerik.
- **Fullskjerm** og **PWA**-støtte (manifest, ikoner, iOS «legg til på Hjem-skjerm»).

### 5.3 Klasse- og timeplanhåndtering
- Flere klasser; vis inntil to klasser samtidig i tidslinjen.
- **Fådelt klasse-støtte** (f.eks. «7. og 8.») med delte økter per trinn.
- **Visuell timeplaneditor** (paint-by-click): velg fag, klikk celle; del/slå sammen celler for fådelte trinn; rediger tidsrammer.
- **Fagfarger og emojier** med automatisk palettgenerering; synkroniseres til hovedskjermen.
- **Lærer-innlogging** (passord) for redigeringsrettigheter.

### 5.4 Tekniske egenskaper i dag
- **Stack**: React + Vite, ren klientapp.
- **Lagring**: `localStorage` / `sessionStorage` per nettleser/enhet.
- **Distribusjon**: statisk bygg via GitHub Pages, automatisk deploy (GitHub Actions).
- **Språk**: norsk (bokmål) gjennomgående.
- **Personvern i dag**: ingen konto, ingen server, ingen innsamling av persondata – all data blir på enheten.

### 5.5 Kjente begrensninger i Fase 0
- Data er **bundet til én nettleser/enhet** – ingen synk, ingen backup.
- Ingen konto, roller eller deling mellom lærere/klasser.
- Ingen sentral administrasjon eller utrulling.
- Passordbeskyttelsen er lokal og ikke egnet for reell tilgangsstyring.

---

## 6. Produktstrategi – faseinndeling

Veien fra dagens MVP til nasjonal distribusjon deles i fem faser. Hver fase er selvstendig
verdifull og kan lanseres for seg.

### Fase 0 — MVP på én enhet *(nå)*
Gratis, lokal, ingen konto. Verdi: umiddelbar nytte for enkeltlærere.

### Fase 1 — Konto og sky-synkronisering
**Mål:** En lærer kan bruke sitt oppsett på flere enheter og ikke miste data.
- Innlogging (e-post, senere Feide).
- Skylagring av lærerens klasser, timeplaner, fagfarger, agendaer.
- Eksport/import og backup.
- Fortsatt **ingen elevpersondata**.

### Fase 2 — Skolenivå (multi-klasserom, multi-lærer)
**Mål:** En hel skole kan ta i bruk produktet koordinert.
- **Skole som «tenant»** (organisasjonskonto).
- Roller: lærer, skoleadministrator/rektor.
- Delte/felles timeplaner og fagoppsett på skolenivå.
- Enhetsmodus for delte klasseromsskjermer (skjerm uten personlig pålogging).
- **Feide-innlogging** som standard.

### Fase 3 — Multi-skole SaaS
**Mål:** Hvilken som helst skole i Norge kan registrere seg selv.
- Full multi-tenancy (streng dataisolering mellom skoler).
- Selvbetjent onboarding og abonnement/fakturering.
- Support, statusside, driftsovervåking.
- Databehandleravtale (DPA) som standard.

### Fase 4 — Nasjonal distribusjon via Udir
**Mål:** Innkjøpsklar for offentlig sektor og distribuerbar nasjonalt.
- Full dokumentert samsvar: UU (EN 301 549 / WCAG 2.1 AA), GDPR, ROS, DPA.
- Norsk/EØS datalagring, SLA-er, driftsavtaler.
- Mulig integrasjon mot nasjonale/administrative timeplan- og elevsystemer.
- Anskaffelses-/rammeavtaledokumentasjon.

---

## 7. Funksjonelle krav

Prioritet: **P0** = kritisk, **P1** = viktig, **P2** = ønskelig.

### 7.1 Videreføres/forbedres fra Fase 0
| ID | Krav | Prioritet |
|---|---|---|
| F-01 | Sanntidsvisning av gjeldende aktivitet og nedtelling | P0 |
| F-02 | Fargelagt tidslinje med nåtidsmarkør | P0 |
| F-03 | Timeplaneditor (visuell) med fådelt-støtte | P0 |
| F-04 | Timer, nedtellinger, agenda, notat | P1 |
| F-05 | Temaer og fullskjerm/PWA | P1 |
| F-06 | Tidssimulering for planlegging | P2 |

### 7.2 Nytt – Fase 1 (konto og synk)
| ID | Krav | Prioritet |
|---|---|---|
| F-10 | Brukerregistrering og innlogging | P0 |
| F-11 | Skylagring og synk av lærerens oppsett på tvers av enheter | P0 |
| F-12 | Backup, eksport og import av data | P1 |
| F-13 | «Gjenopprett» ved tapt lokal lagring | P1 |

### 7.3 Nytt – Fase 2 (skolenivå)
| ID | Krav | Prioritet |
|---|---|---|
| F-20 | Skole-/organisasjonskonto med dataisolering | P0 |
| F-21 | Roller og tilgangsstyring (lærer, admin) | P0 |
| F-22 | Feide-pålogging | P0 |
| F-23 | Delte timeplaner/fagoppsett på skolenivå | P1 |
| F-24 | Enhetsmodus for delt klasseromsskjerm (kioskmodus, ingen personlig pålogging) | P1 |
| F-25 | Overføre/dele en klasse til vikar | P2 |

### 7.4 Nytt – Fase 3–4 (SaaS og nasjonalt)
| ID | Krav | Prioritet |
|---|---|---|
| F-30 | Selvbetjent onboarding for skoler | P0 |
| F-31 | Abonnement/fakturering (eller lisensmodell for offentlig sektor) | P0 |
| F-32 | Administrasjonspanel for kommune/skoleeier | P1 |
| F-33 | Integrasjon mot administrativt timeplansystem (import av timeplan/roster) | P1 |
| F-34 | Flerspråklig UI (bokmål, nynorsk, samiske språk, engelsk) | P1 |
| F-35 | Sentral utrulling/enhetsstyring (MDM-vennlig) | P2 |

---

## 8. Ikke-funksjonelle krav

### 8.1 Universell utforming (UU) — *lovpålagt for offentlig sektor*
- Skal oppfylle **WCAG 2.1 nivå AA** og **EN 301 549**, i tråd med forskrift om universell utforming av IKT.
- Krav bl.a.: fullgod tastaturnavigasjon, tilstrekkelig fargekontrast, skjermleser-støtte,
  respekt for «reduser bevegelse», skalerbar tekst.
- **Konsekvens for design:** dagens sterke temaer og animasjoner (stjerner, gradienter) må ha
  tilgjengelige varianter og kontrollerbare kontrastnivåer.
- UU-erklæring (tilgjengelighetserklæring) skal publiseres før offentlig salg.

### 8.2 Personvern og sikkerhet (GDPR / personvern)
- **Dataminimering:** samle inn minst mulig; unngå elevpersondata så langt mulig.
  Dagens design (kun timeplan/fag, ingen elevnavn) er et **konkurransefortrinn** som bør bevares.
- **Databehandleravtale (DPA):** standardavtale mellom skole (behandlingsansvarlig) og leverandør (databehandler).
- **Innebygd personvern (privacy by design)** og ROS-analyse per fase.
- **Datalagring i EØS/Norge** for offentlig sektor.
- Kryptering i transitt og hvile; tilgangslogging; sletterutiner.
- Tilsynsmyndighet: **Datatilsynet**.

### 8.3 Pålitelighet og drift
- Skjermen skal tåle **hele skoledager uten manuell oppdatering**.
- Skal fungere ved **midlertidig nettbrudd** (offline-modus / cache).
- Måltall for Fase 3–4: oppetid ≥ 99,9 %, definert SLA og statusside.

### 8.4 Ytelse og kompatibilitet
- Rask lasting og lav ressursbruk (kjører ofte på rimelige/eldre klasseromsenheter,
  Chromebooks, smartboards, Apple TV / iPad).
- Støtte for moderne nettlesere; PWA for «app-lignende» bruk.

### 8.5 Vedlikeholdbarhet
- Klar komponentstruktur (allerede påbegynt i React-migrering).
- Automatiserte tester og CI før produksjonsutrulling.

---

## 9. Arkitektur – utvikling over faser

> PRD-et beskriver *hva* og *hvorfor*; teknisk design kommer i eget dokument. Nedenfor kun retning.

| Lag | Fase 0 (nå) | Fase 1–2 | Fase 3–4 |
|---|---|---|---|
| **Frontend** | React + Vite, statisk | Samme, med auth-klient | Samme + admin-flater, i18n |
| **Lagring** | localStorage per enhet | Sky-database per bruker | Multi-tenant DB med streng isolering |
| **Auth** | Lokalt passord | E-post + Feide (valgfri) | Feide som standard, SSO |
| **Backend** | Ingen | Lett API + database | Skalerbar tjeneste, EØS-hosting |
| **Drift** | GitHub Pages | Managed hosting | SLA, overvåking, statusside |
| **Integrasjon** | Ingen | Eksport/import | Timeplan-/roster-import |

**Viktig prinsipp:** Bygg multi-tenancy og rollemodell inn *tidlig* (senest Fase 2), slik at
dataisolering mellom skoler ikke må ettermonteres. Dette er en forutsetning for både
SaaS-skalering og Udir-anskaffelse.

---

## 10. Regelverk og innkjøpsklarhet (for Udir-målet)

Sjekkliste som må være på plass før salg til offentlig sektor:

- [ ] **UU:** WCAG 2.1 AA / EN 301 549 samsvar + publisert tilgjengelighetserklæring.
- [ ] **Personvern:** GDPR-samsvar, ROS-analyse, DPIA ved behov, databehandleravtale-mal.
- [ ] **Feide:** integrert og godkjent (forvaltes av Sikt).
- [ ] **Datalagring:** dokumentert EØS/Norge-lokasjon.
- [ ] **Sikkerhet:** sikkerhetsvurdering, penetrasjonstest, hendelseshåndtering.
- [ ] **Drift:** SLA, support, statusside, backup/gjenoppretting.
- [ ] **Anskaffelse:** tilpasset offentlige anskaffelsesregler; vurdér rammeavtale
      (nasjonalt via Udir, eller regionalt via fylke/kommune/skoleeier).
- [ ] **Pedagogisk begrunnelse:** dokumentert nytte, gjerne fra pilotskoler.

> **Merk:** Udir anskaffer ikke nødvendigvis alle skoleverktøy sentralt – mye kjøpes av
> kommuner/fylker (skoleeiere) eller den enkelte skole. En realistisk go-to-market bør derfor
> ha **to spor parallelt**: (a) bottom-up adopsjon (enkeltlærere/skoler) og (b) top-down
> anskaffelse (skoleeier/Udir). Spor (a) skaper referanser som muliggjør spor (b).

---

## 11. Suksesskriterier og måltall (KPI-er)

| Fase | Eksempler på KPI |
|---|---|
| Fase 0–1 | Antall aktive lærere/uke; retensjon uke-over-uke; antall klasser satt opp |
| Fase 2 | Antall skoler med ≥ 5 aktive lærere; andel klasserom dekket per skole |
| Fase 3 | Selvbetjente skoleregistreringer; MRR/lisensinntekt; churn |
| Fase 4 | Antall kommuner/skoleeiere med avtale; nasjonal dekningsgrad; UU-/personvernsamsvar bestått |

Kvalitative mål: positive tilbakemeldinger fra lærere om redusert friksjon; observert nytte
for elever med tilretteleggingsbehov.

---

## 12. Go-to-market (skisse)

1. **Pilot:** 3–5 skoler/klasser som testbrukere; samle tilbakemeldinger og referanser.
2. **Bottom-up vekst:** gratis/rimelig for enkeltlærere → organisk spredning på lærerrom.
3. **Skoleavtaler:** når nok lærere på en skole bruker det, selg skolelisens (Fase 2–3).
4. **Skoleeier/kommune:** rammeavtaler regionalt.
5. **Udir/nasjonalt:** med referanser, samsvarsdokumentasjon og pilotresultater på plass.

---

## 13. Risiko og tiltak

| Risiko | Konsekvens | Tiltak |
|---|---|---|
| UU-krav undervurderes | Blokkerer offentlig salg | Bygg UU inn fra Fase 1; ekstern UU-revisjon før Fase 4 |
| Personvern/elevdata | Juridisk og omdømmerisiko | Behold dataminimering; unngå elevpersondata; DPA + ROS |
| Multi-tenancy ettermonteres | Kostbar omskriving, datalekkasjerisiko | Design tenant-isolering senest Fase 2 |
| Avhengig av manuell timeplan-input | Høy oppstartsfriksjon | Timeplan-import (F-33) i Fase 3 |
| Offentlig innkjøp er tregt/komplekst | Lang salgssyklus | Kjør bottom-up parallelt; skaff referanser tidlig |
| Konkurranse fra LMS-er / infoskjermer | Markedspress | Hold fokus på klasseromsspesifikk, norsk, UU-god nisje |

---

## 14. Åpne spørsmål

- Skal produktet forbli **gratis for enkeltlærere** permanent (freemium), eller kun i en periode?
- **Prismodell** mot skole/kommune: per skjerm, per lærer, per skole, eller flat kommunelisens?
- Skal vi bygge **egen backend** eller bruke en managed backend-plattform (time-to-market vs. kontroll)?
- Hvilke **administrative timeplansystemer** er viktigst å integrere først (Visma InSchool, IST, TimeEdit)?
- Trenger vi **nynorsk og samiske språk** allerede i Fase 2, eller er det Fase 4?
- Hvem eier **UU- og personvern-sertifiseringsarbeidet** – internt eller ekstern konsulent?

---

## 15. Vedlegg / referanser (utfylles)

- Tilgjengelighetserklæring (mal) – *TBD*
- ROS-/DPIA-analyse – *TBD*
- Databehandleravtale (mal) – *TBD*
- Teknisk designdokument (arkitektur) – *TBD*
- Feide-integrasjonsplan – *TBD*

---

*Dette er et levende dokument. Neste steg: prioritér Fase 1-omfang, avklar prismodell og
beslutt backend-strategi.*
