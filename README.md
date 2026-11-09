# Snoop Book

En diegetisk prototype laget med design fiction i emnet **IN5190 Design for Sustainability** ved UiO (prosjektet *Information Anarchy*).

## Konseptet

Q-day er den hypotetiske dagen da kvantedatamaskiner kan knekke dagens kryptering. Prototypen viser et samfunn der det har skjedd: all data som en gang var kryptert, er nå dekryptert og tilgjengelig for alle.

**Snoop Book** er et crowdsourcet verktøy som gjør denne datamengden lett å bruke. Det samler alt som finnes om en person i én profil, med kontaktinfo, bevegelsesmønster, økonomi, helse, relasjoner, politisk ståsted og en «score» for personlighet og omdømme.

Prototypen skal få folk til å tenke over personvern, tillit og makt over informasjon. Den er ikke ment som et ekte produkt.

> **Alle personer og all data er oppdiktet.** Profilbildene er KI-genererte ansikter fra [thispersondoesnotexist.com](https://thispersondoesnotexist.com).

## Kjør prototypen

Du trenger verken server eller build-steg. Åpne `index.html` i en nettleser:

```sh
open index.html
```

## Sider

- **Hjem (`index.html`):** chatboten *Ask the Archive* der du kan spørre arkivet om personer eller temaer (penger, kjærlighet, helse, politikk, jobb). Under ligger en feed med oppsiktsvekkende funn fra de dekrypterte dataene, slik brukerne har lagt dem ut. Du kan bytte mellom **Trending** (mest verifisert) og **Your network** (folk du kjenner). Innleggene kan verifiseres, bestrides, kommenteres og deles.
- **Min profil (`me.html`):** profilen til brukeren selv, Sofie Lund. Øverst ser du hvem som har sett på deg, hvor mange som ser på profilen din, nye funn om deg og hva du selv har avslørt om andre. Du kan bestride et funn, legge til kontekst eller betale for å skjule det med «Snoop Premium». Under ligger din egen saksmappe, slik alle andre ser den.
- **Profil (`profile.html?id=jan-thomas`):** alt arkivet vet om én person. Trykk på en av de seks kategoriene for å åpne en tidslinje med hendelser. Economy viser i tillegg kontobalansen de siste 24 månedene. Du kan lenke direkte til en kategori, f.eks. `profile.html?id=jan-thomas#love`.

Chatboten er skriptet og bruker søkeord, ikke en ekte KI. Svarene hentes fra dataene i `data.js`.

## Struktur

| Fil / mappe | Innhold |
| --- | --- |
| `index.html` / `home.js` / `home.css` | Hjemside med chatbot og feed |
| `profile.html` / `profile.js` | Profilsiden |
| `me.html` / `me.js` / `me.css` | Min profil |
| `timeline.js` | Tidslinjene i de seks kategorivisningene (håndskrevne og genererte hendelser) |
| `data.js` | Profiler, relasjoner, innlegg i feeden og hvem som er i ditt nettverk |
| `styles.css` | Felles design og profilside-layout |
| `assets/` | Kart, bevegelsesrute og profilbilder (`assets/profiles/`) |

## Legge til en ny profil

1. Lagre et bilde fra thispersondoesnotexist i `assets/profiles/`:
   ```sh
   curl -sL -o assets/profiles/kari.jpg https://thispersondoesnotexist.com/random-person.jpeg
   ```
   Du får et nytt tilfeldig ansikt hver gang. Kjør kommandoen på nytt til du får et som passer til personen.
2. Kopier profilen `"jan-thomas"` i `data.js`, gi den en ny nøkkel (f.eks. `"kari"`) og fyll inn feltene.
3. Legg til relasjonene til personen i `SNOOP_RELATIONS`, f.eks. `{ id: "jan-thomas", relation: "Father", note: "Calls once a month" }`. Sett `hidden: true` på relasjoner personen prøver å skjule, f.eks. en elskerinne. De vises i rødt.
4. Åpne `profile.html?id=kari`.

## Legge til et innlegg i feeden

Legg til et objekt i `SNOOP_POSTS` i `data.js`. Feltet `author` er den som fant funnet og `subject` er den det handler om (begge er profil-ID-er). `evidence` er det «dekrypterte» utdraget som vises i innlegget. `SNOOP_VIEWER` bestemmer hvem du er (`id`), hvem som er i nettverket ditt, og tallene på Min profil (profilvisninger, hvem som har sett på deg osv.). Vil du bytte hvem brukeren er, endrer du `SNOOP_VIEWER.id` til en annen profil.

## Design

Utgangspunktet er Figma-designet [Snoop book](https://www.figma.com/design/kGANB3Bud2uuXD4L9y1nFT/Snoop-book?node-id=1-32), som er laget for MacBook Pro 14" (1512 px bredde). Siden tilpasser seg også mindre skjermer og mobil.

## Status

Tidlig prototype med hjemside og profilside. Hendelsene for Jan Thomas er skrevet for hånd. For de andre lages de automatisk ut fra alder, jobb og relasjoner. Vil du skrive egne hendelser for en person, legger du dem i `SNOOP_TIMELINES` i `timeline.js`.

## Gruppe

Anna Steinmoen Jacobsen, Elizaveta Yuschenko, Malin Gustavsen, Mats Ugland, Mina de Paoli Williams og Sanna Marlene Schøning.
