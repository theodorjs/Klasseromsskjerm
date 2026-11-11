// Skoler som har Klasseskjerm på sin egen nettside, som i Kooperative grupper.
// Et lite skript i index.html og timer/index.html velger skole etter adressen
// før siden tegnes, og setter data-skole på <html>. Tabellen i de to skriptene
// må stemme med SKOLER.
//
// En skole gjelder når adressen begynner med et av prefiksene, for eksempel
// torderodskole.no og torderod.github.io. «www.» foran teller ikke.
// ?skole=<id> forhåndsviser en skole (for eksempel på github.io), ?skole=ingen slår av.

//
// `tjeneste` er skolens egen tjeneste for Feide-innlogging og bursdager
// (se src/utils/ksTjeneste.js). Den brukes bare fra adressene i `opprinnelser`,
// fordi tjenesten bare svarer dem; forhåndsvisning med ?skole= lar den være.
export const SKOLER = [{
  id: 'torderod',
  navn: 'Torderød skole',
  prefiks: ['torderod'],
  tjeneste: 'https://ks-data.torderod.no',
  opprinnelser: ['https://torderod.no', 'https://www.torderod.no'],
}];

/** Skolen siden vises hos nå, eller null. */
export function aktivSkole(rot = globalThis.document?.documentElement) {
  const id = rot?.dataset?.skole;
  return SKOLER.find(s => s.id === id) ?? null;
}
