# Klasseromsskjerm - Developer Documentation

## 📝 Prosjektets formål og funksjon
**Klasseromsskjerm** er en interaktiv web-applikasjon designet for lærere for å styre skoledagen. Den fungerer som en sentral skjerm i klasserommet som viser:
- **Tidslinje:** En visuell oversikt over dagens fag og pauser.
- **Nedtelling:** Viser gjenværende tid av nåværende aktivitet.
- **Agenda:** En liste over gjøremål/mål for økta.
- **Timer:** Tidtaking for oppgaver.
- **"Under panseret" (Editor):** Et administrasjonslag for å legge inn timeplaner for ulike klasser, definere fagfarger og overstyre tidspunkter.

Systemet bruker et **Neumorphic design-språk** (soft UI) med fokus på dybde, glassmorfisme og animasjoner. All data lagres lokalt i `localStorage`.

## 🛠 Teknisk oversikt
- **Språk:** Vanilla JavaScript, CSS3 og HTML5.
- **Datahåndtering:** Objekt-basert lagring av klasser, timeplaner og fagfarger i `localStorage`.
- **Modus:** Støtter `light-mode`, `dark-mode`, `star-mode` og `colorful-mode`.
- **Responsivitet:** Tilpasset både stor skjerm (tavle) og mindre skjermer (mobil/nettbrett).

## 🔄 Gjennomført arbeid
- Implementert et omfattende **Neumorphic design system**.
- Utviklet en **Toolbox** (verktøykasse) som glir ut fra bunnen.
- Laget en **"Under panseret" editor** med split-screen animasjon.
- Implementert **Subject Colors** (fagfarger) som lar lærere fargekode fag på tidslinjen.
- Utviklet en kompleks tidslinje-generator som beregner bredder basert på varighet.

## ⚠️ Gjentakende utfordringer
1. **Z-index og Layout-konflikter:** Toolbox-menyen og dens undermenyer (temavelger, tidsvelger) har ofte konflikter med hover-states og klikk-regioner.
2. **Statustilstand (State Management):** Å holde tidslinjen synkronisert mellom system-tid og simulert tid ("Velg tid") har ført til gjentakende bugs med tomme tidslinjer.
3. **HTML-struktur i store filer:** Ved omfattende endringer i `index.html` har vi opplevd syntaksfeil (ubalanserte tagger) som krasjer JavaScript-eksekveringen.
4. **CSS-spesifisitet:** Overgangen mellom mange fagemoduser (stjerne, lys, mørk) krever nøye styring av CSS-klasser for å unngå visuelle glipper.

## 🚧 Hva vi prøver å fikse akkurat nå
1. **Tidslinje-regresjon:** Tidslinjen vises for øyeblikket som en tom beholder i alle moduser. Aktivitetsboksene (`event-box`) blir ikke generert/tegnet riktig.
2. **Unified Time Picker:** Vi designer om tidsvelgeren fra små nedtrekksmenyer til et samlet, neumorfisk panel med dager på venstre side og tid-valg på høyre side. Vi sliter med at panelet lukker seg uventet ved hover over visse elementer.
3. **Timer-verktøyet:** Timeren åpner seg ikke ved klikk, sannsynligvis en kollisjon i event-handling eller CSS `display` egenskaper.
4. **Agenda-vindu:** Agendaen skal flyttes fra å være en "skuff" på venstre side til å bli et flytende, flyttbart og resizable vindu.

## 🚀 Veien videre
- **Robust Tidslinje:** Stabilisere renderings-logikken slik at den er immun mot modus-skifter.
- **Floating Panels:** Implementere en felles logikk for flytbare (draggable) vinduer for både Agenda og Timer.
- **Cleanup:** Fjerne gammel kode for tidsvisning og nedtrekksmenyer som er erstattet av det nye panelet.
- **Firebase:** Vurdere overgang fra `localStorage` til Firebase for å tillate synkronisering mellom læreres enheter.
