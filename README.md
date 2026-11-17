# Snoop Book

En diegetisk prototype laget med design fiction i emnet **IN5190 Design for Sustainability** ved UiO (prosjektet *Information Anarchy*).

## Konseptet

Q-day er den hypotetiske dagen da kvantedatamaskiner kan knekke dagens kryptering. Prototypen viser et samfunn der det har skjedd: all data som en gang var kryptert, er nå dekryptert og tilgjengelig for alle.

**Tidslinjen i verdenen:**

- **2026, nåtid:** et teknoføydalistisk samfunn. Vi deler data fordi vi ikke har noe reelt valg, og regner med at den oppbevares trygt.
- **2029, Q-day:** IBM knekker krypteringen. For folk flest er det en helt vanlig dag.
- **14. august 2030, The Big Leak:** en hackergruppe kaprer IBMs maskiner via peer-to-peer og dekrypterer all data som noensinne er lagret. Plattformer som Snoop Book vokser frem uten regulering.
- **3. september 2030, appens «i dag»:** Anna forbereder seg til første forelesning i IN5190. Litt uskyldig snoking på foreleser Enya fører henne ned i et kaninhull. Folk snakker fint om Enya, men han har solgt studentenes prosjektarbeid til konsulenter. Enya har sett på Annas profil, og medforeleser Henrik har advart ham: «Pass på Anna… hun jukset på eksamen» (i 2026). Medstudentene hun vil ha på gruppe, har snakket om henne bak ryggen hennes. Relasjonene er skadet før de har møttes.

**Snoop Book** er en plattform som gjør denne datamengden lett å bruke. Den samler alt som finnes om en person i én profil, med kontaktinfo, bevegelsesmønster, økonomi, helse, straffeattest, relasjoner og politisk ståsted. KI-en *Snoop AI* plukker ut den saftigste sladderen og anslår indekser for lojalitet, kriminalitet, ærlighet og IQ. Ingen brukere publiserer noe selv: det er KI-en som kuraterer.

Prototypen skal få folk til å tenke over personvern, tillit og makt over informasjon. Den er ikke ment som et ekte produkt.

> **All data er oppdiktet.** Karakterene og scenarioet kommer fra Storytelling-siden i Figma: Anna (brukeren), foreleserne Enya og Henrik, og medstudentene Mats, Sanna, Liza, Mina og Malin. Profilbildene er hentet fra samme side.

## Kjør prototypen

Du trenger verken server eller build-steg. Åpne `index.html` i en nettleser:

```sh
open index.html
```

## Sider

- **Onboarding:** vises første gang appen åpnes. Den forklarer Snoop Book og at appen er crowdsourcet og peer-to-peer: installerer du den, blir telefonen din en node som hoster arkivet. Så kommer vilkår med et bevisst mørkt mønster («Accept all»), og et «opprett bruker»-skjema som fyller seg selv (bait and switch): appen vet allerede hvem du er. Spill den av igjen med `index.html?intro` eller lenken «Replay intro» i sidepanelet.
- **Hjem (`index.html`):** chatboten *Ask the Archive* der du kan spørre arkivet om personer eller temaer (penger, kjærlighet, helse, kriminalitet, politikk, jobb). Under ligger en feed med sladder som Snoop AI har funnet i de dekrypterte dataene, rangert etter «juice». Fanen **For you** følger rekkefølgen i live-demoen; du kan også bytte til **Juiciest** og **Your network** (folk du kjenner). Klikk på en sak for å lese hele saken med bevis, flere funn og hvem som er involvert. Hver kilde vises med et lite ikon (Facebook, Messenger, bank, politi osv.).
- **Min profil (`me.html`):** profilen til brukeren selv, Anna Steinmoen Jacobsen. Øverst ser du nøyaktig hvem som har sett på deg og hva de så på (hvilken seksjon, hvilket dokument, skjermbilder), sladder om deg, profilvisninger og hvem du selv har sjekket. Du kan bestride sladder eller legge til kontekst. Under ligger din egen saksmappe, slik alle andre ser den.
- **Profil (`profile.html?id=enya`):** alt arkivet vet om én person: oppsummering, kart, Snoop-indeksene, nettverk og «Juiciest gossip». Trykk på en av de sju kategoriene (blant annet Criminal Record) for å åpne en tidslinje. Economy viser i tillegg kontobalansen de siste 24 månedene. Du kan lenke direkte til en kategori, f.eks. `profile.html?id=enya#criminal`.

Chatboten er skriptet og bruker søkeord, ikke en ekte KI. Svarene hentes fra dataene i `data.js`.

## Struktur

| Fil / mappe | Innhold |
| --- | --- |
| `index.html` / `home.js` / `home.css` | Hjemside med chatbot og feed |
| `profile.html` / `profile.js` | Profilsiden |
| `me.html` / `me.js` / `me.css` | Min profil |
| `timeline.js` | Tidslinjene i kategorivisningene (håndskrevne og genererte hendelser) |
| `onboarding.js` / `onboarding.css` | Onboardingen |
| `icons.js` | Kildeikoner (merkelogoer fra Simple Icons, øvrige fra Lucide) |
| `gossip-detail.js` | «Les hele saken»-vinduet som åpnes når du klikker på en sak |
| `data.js` | Profiler, relasjoner, innlegg i feeden og hvem som er i ditt nettverk |
| `styles.css` | Felles design og profilside-layout |
| `assets/` | Kart, bevegelsesrute og profilbilder (`assets/profiles/`) |

## Legge til en ny profil

1. Lagre et bilde fra thispersondoesnotexist i `assets/profiles/`:
   ```sh
   curl -sL -o assets/profiles/kari.jpg https://thispersondoesnotexist.com/random-person.jpeg
   ```
   Du får et nytt tilfeldig ansikt hver gang. Kjør kommandoen på nytt til du får et som passer til personen.
2. Kopier profilen `"anna"` i `data.js`, gi den en ny nøkkel (f.eks. `"kari"`) og fyll inn feltene.
3. Legg til relasjonene til personen i `SNOOP_RELATIONS`, f.eks. `{ id: "anna", relation: "Classmate", note: "IN5190" }`. Sett `hidden: true` på relasjoner personen prøver å skjule, f.eks. en hemmelig chat. De vises i rødt.
4. Åpne `profile.html?id=kari`.

## Legge til sladder

Legg til et objekt i `SNOOP_GOSSIP` i `data.js`. `subject` er den det handler om, `mentions` er andre som er involvert, `juice` (0–100) er hvor saftig Snoop AI mener det er, og `reads` er antall lesere. `headline` er overskriften, `details` er ekstra funn som bare vises i hele saken, og `feed: false` holder saken ute av hjemmefeeden (den finnes bare på profilen, f.eks. Enyas salg av studentprosjekter). `evidence.source` styrer ikonet: står det f.eks. «Facebook» eller «Messenger» i kilden, vises den logoen. Indeksene ligger i `indexes` på hver profil. `SNOOP_VIEWER` bestemmer hvem du er (`id`), nettverket ditt, hvem som har sett på deg og nøyaktig hva (`viewers[].items`), og hvem du selv har sjekket (`lookedAt`). `forYou` styrer rekkefølgen i For you-fanen. `profile: false` på en sak holder den unna profiler (bare feeden), og `image` legger et bilde ved saken. Annas kamerarull (`gallery`) vises på Min profil; legg bildene i `assets/gallery/` (1.jpg–8.jpg). Etter onboardingen sendes du rett til Min profil. En sak kan åpnes direkte med `#gossip=<id>` i adressen, f.eks. `index.html#gossip=g12`.

## Design

Utgangspunktet er Figma-designet [Snoop book](https://www.figma.com/design/kGANB3Bud2uuXD4L9y1nFT/Snoop-book?node-id=1-32), som er laget for MacBook Pro 14" (1512 px bredde). Siden tilpasser seg også mindre skjermer og mobil.

## Status

Tidlig prototype med hjemside og profilside. Noen hendelser for Anna er skrevet for hånd. Resten lages automatisk ut fra alder, jobb og relasjoner. Vil du skrive egne hendelser for en person, legger du dem i `SNOOP_TIMELINES` i `timeline.js`.

## Gruppe

Anna Steinmoen Jacobsen, Elizaveta Yuschenko, Malin Gustavsen, Mats Ugland, Mina de Paoli Williams og Sanna Marlene Schøning.
