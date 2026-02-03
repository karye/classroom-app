# Projekt Historik

Här loggas alla större förändringar i projektet "Classroom Matrix Dashboard".

## 2026-02-03

### ✨ Nya Funktioner
*   **Inställningar 2.0:** Flyttat inställningar från en modal till en **egen fullskärmsvy**.
    *   Lagt till flikar: "Anpassning" och "Systemdata".
    *   **Systemdata:** Ny dashboard som visar databasstorlek, cache-status och server-anteckningar per kurs.
    *   Möjlighet att rensa cache för specifika kurser.
*   **Enhetliga Verktygsfält:**
    *   **Matrisvy:** Ersatt separata checkboxar med en Dropdown ("Alla", "Uppgifter", "Prov"). Tagit bort "Att rätta"-filtret.
    *   **Todo-vy:** Uppdaterat verktygsfältet för att matcha Matrisvyn (samma Dropdown-logik).

### ⚡ Förbättringar & Optimering
*   **Smart Kalender-matchning:** Implementerat en **poängbaserad algoritm** i backend för att koppla kalenderhändelser till rätt kurs.
    *   Straffar felaktiga sektionskoder (t.ex. EE22A vs EE22B) för att förhindra ihopblandning.
    *   Ger hög poäng (50p) för exakt gruppmatchning.
*   **Optimerad Global Synk:**
    *   "Synka"-knappen i Kalendervyn skickar nu bara med ID på *synliga* kurser till backend.
    *   Backend filtrerar bort dolda kurser innan bearbetning, vilket snabbar upp processen avsevärt.
    *   Lagt till en varningsruta ("Bekräfta synk") för att förhindra oavsiktliga tunga körningar.
*   **Kalender-interaktion:**
    *   Klick på en lektion i schemat filtrerar nu sidopanelen ("Att rätta") på den specifika kursen.
    *   Tydligare visuell feedback på vald lektion.

### 🐛 Buggfixar
*   Fixat bugg där parallella kurser (samma ämneskod, olika klasser) blandades ihop i schemat.
*   Fixat inkonsekvent "Synkar..."-indikator i Todo-vyn.

---

## 2026-02-02
En uppdatering fokuserad på att ge läraren verktyg för att filtrera bort "brus" (irrelevanta uppgifter) och få djupare insyn i bedömningsunderlag.

### 🚀 Nytt & Tillagt
*   **Smart Filtrering (Todo & Matris):**
    *   **"Dölj utan poäng" (Todo):** Nytt filter i Att-göra-listan som döljer uppgifter som saknar maxpoäng (t.ex. enkäter eller närvaro), vilket renodlar listan till faktiska bedömningsuppgifter.
    *   **"Deadline" (Matris):** Nytt filter i Matrisvyn som döljer uppgifter som saknar slutdatum, vilket ofta indikerar att de är extra- eller stödmaterial snarare än skarpa uppgifter.
    *   Valen sparas i `localStorage` och minns mellan sessioner.
*   **Detaljerad Konsol-loggning:**
    *   Implementerat en avancerad `console.table`-vy i Todo-vyn.
    *   Vid val av en uppgift loggas nu en komplett lista över alla elever med deras status (**Inlämnad**, **Betygsatt**, **Tilldelad**) och poäng (t.ex. "8/10") direkt i webbläsarens konsol (F12).
    *   Ger total transparens för felsökning eller detaljgranskning.
*   **Tydligare Synk-status:**
    *   Uppdateringsknappen i toppmenyn visar nu texten "Synkar..." och blir blå när applikationen arbetar mot Google API, för att tydligt skilja på nätverksaktivitet och lokal filtrering.

### 🔧 Backend & Arkitektur
*   **API-utökning:** `/api/todos` och `/api/courses/:id/todos` returnerar nu `maxPoints` för varje uppgift.
*   **Loggning:** Backend loggar nu en sammanfattning av alla hämtade uppgifter och deras status i serverloggen vid varje anrop, vilket underlättar felsökning.
*   **DevOps:** Uppdaterat `Dockerfile` och npm-beroenden för att åtgärda säkerhetsvarningar och `deprecated`-meddelanden.

---

## [2026-02-01] - "Dashboard & Kursfiltrering"

Fokus för dagen var att ge läraren bättre kontroll över vilka kurser som visas och en snabb överblick över vad som är viktigast just nu.

### 🚀 Nytt & Tillagt
*   **Dashboard i Schema-vyn:**
    *   Lagt till en sidopanel ("Dashboard") till höger om kalendern.
    *   **Top-5 Att Rätta:** Visar automatiskt de 5 senaste inlämningarna som väntar på bedömning (status `TURNED_IN`), sorterat på datum.
    *   Ger en direkt överblick över arbetsbördan utan att behöva byta vy.
*   **Kursfiltrering (Inställningar):**
    *   Ny sektion "Dina klassrum" i inställningsfönstret.
    *   Möjlighet att dölja specifika kurser (t.ex. gamla eller irrelevanta klassrum) via checkboxar.
    *   Valet sparas persistent på servern och påverkar hela applikationen (menyer, matriser, todos).
*   **Smart Dashboard:**
    *   Listan "Att rätta" respekterar nu de dolda kurserna, så du ser bara uppgifter från de klassrum du är aktiv i.

### 🔧 Backend & Arkitektur
*   **Utökad Inställningsmodell:** Uppdaterat `Settings`-modellen i frontend för att hantera `hiddenCourseIds`.
*   **Reaktivitet:** Schema-vyn uppdateras omedelbart när man ändrar kursurvalet i inställningarna.
*   **Vyminne (Per View):**
    *   Appen kommer nu ihåg det senast valda klassrummet för varje specifik vy (Matris, Stream).
    *   Om inget val gjorts väljs automatiskt den första synliga kursen.
*   **Prestandaoptimering:**
    *   Todo-vyn använder nu memoization (`useMemo`) för tunga beräkningar, vilket eliminerar fördröjningen vid byte av flik.

### 🐛 Buggfixar
*   **React Hook Error:** Åtgärdat ett kritiskt renderingsfel (#310) i `App.jsx` relaterat till villkorliga hook-anrop.
*   **Oändlig Laddning:** Fixat en bugg där uppdateringsikonen snurrade för evigt i Schema-vyn på grund av en instabil referens till kurslistan.
*   **Schedule-knappen:** Fixat en krasch när man klickade på Schema-ikonen för att återställa kursvalet.

---

## [2026-01-31] - "Global Schema-vy & UI-harmonisering"

En stor uppdatering som introducerar en helt ny schemamodul och skapar ett enhetligt visuellt språk genom hela applikationen.

### 🚀 Nytt & Tillagt
*   **Global Schema-vy (NY!):**
    *   **Vertikal Veckokalender:** En ny huvudvy som visar lektioner från *alla* aktiva kurser i ett klassiskt schemaformat (08:00 - 18:00).
    *   **Smart Kalender-synk:** Integrerad sökning som hämtar händelser både från Classrooms egna kalendrar och lärarens primära kalender (letar efter kurskoder som `PRRPRR01`, `WEUWEB01` etc.).
    *   **Krockhantering:** Avancerad layoutalgoritm som placerar överlappande lektioner sida-vid-sida för en realistisk vy.
    *   **Färgkodning:** Varje kurs får en unik pastellfärg baserat på dess namn för snabb igenkänning.
*   **Enhetliga Status-piller (StatusBadge):**
    *   Ny gemensam komponent för att visa status ("Inlämnad", "Klar", "Sen", "Ej inlämnad").
    *   Implementerad i Todo-vyn och Elevöversikten för en konsekvent upplevelse.
*   **Harmoniserade Verktygsrader:**
    *   Varje vy har nu en identisk verktygsrad med sökfält ("Filtrera...") till vänster.
    *   Implementerat text-sökning i **Stream-vyn** och **Todo-vyn**.
    *   Standardiserad stil på sorteringsväljare och knappar.

### 💅 Design & UX
*   **Omstrukturerad Navigering:** Schema-ikonen har flyttats längst till vänster och separerats med en vertikal linje för att markera dess globala natur.
*   **Visuell Feedback:** Kursväljaren tonas nu ner (50% opacitet) när man befinner sig i Schema-vyn eftersom den inte är applicerbar där.
*   **Optimerad Matris:** Cellerna i matrisen använder nu ultrakompakta ikoner istället för piller för att behålla överblickbarheten, medan de detaljerade vyerna behåller de tydliga pillren.

### 🔧 Backend & Arkitektur
*   **Global händelse-endpoint:** Ny `/api/events` som aggregerar söktermer från alla kurser och filtrerar kalenderdata i ett svep.
*   **Offline-First Robusthet:**
    *   Förbättrad felhantering i alla vyer: Om nätverket svajar eller API:et ger 404, behålls den gamla cachade datan på skärmen istället för att visa en felsida.
    *   Automatisk ID-validering vid start som rensar bort gamla eller ogiltiga kursval.
*   **Säkerhet:** Utökat OAuth-scopes för att inkludera `calendar.readonly`.

### 🐛 Buggfixar
*   **Återställd Endpoint:** Fixat ett fel där `/announcements` av misstag raderades under utveckling av kalenderfunktionen.
*   **Byggfix:** Åtgärdat "Multiple exports" i `ScheduleView.jsx` som hindrade produktion-bygge.

---

## [2026-01-30] - "Stabilitet & Skalbarhet (IndexedDB & Globala Filter)"

En genomgripande arkitektonisk uppdatering som gör appen redo för stora mängder data och ger användaren kontroll över vad som visas.

### 🚀 Nytt & Tillagt
*   **Migration till IndexedDB:**
    *   Ersatt `localStorage` med `IndexedDB` för all tung cachning.
    *   Stöd för nästintill obegränsad datamängd (löser "QuotaExceededError").
    *   Asynkron laddning förhindrar att UI låser sig vid stora JSON-objekt.
*   **Globala Inställningar (Beständiga):**
    *   Nytt inställningsfönster (Bootstrap 5 Modal) via kugghjul i headern.
    *   **Sökordsfilter:** Dölj uppgifter eller hela ämnen baserat på sökord (t.ex. "Närvaro").
    *   **Server-lagring:** Inställningar sparas i serverns SQLite-databas och synkas mellan enheter.
*   **Förbättrad Matris-vy:**
    *   **Elevsammanställning:** Klicka på en elev för att se ett snyggt "betygskort" med alla resultat.
    *   **Utskriftsoptimering:** Specifika stilar för utskrift av elevsammanställningar.
    *   **Profilbilder:** Elevernas foton visas nu direkt i matrisraderna.
    *   **Layout:** Fixerad kolumnbredd (90px) och stöd för 4 rader text i rubriker.
*   **Smartare Todo-vy:**
    *   **Tredelad lista:** Visar nu inte bara "Att rätta", utan även "Klara" och "Ej inlämnade" elever under varje uppgift.
    *   **Global filtrering:** Respekterar nu även de nya sökordsfiltren.

### 💅 Design & UX
*   **Animerad Feedback:** Den stora roterande pilen mitt på skärmen (och i headern) ger tydlig respons i alla vyer när data hämtas.
*   **Svensk Sortering:** Alla listor och matriser sorteras nu strikt enligt svenska regler (`localeCompare('sv')`).
*   **Enhetlig Stil:** Standardiserad laddningsvy i alla tre huvudmoduler.

### 🔧 Backend & Arkitektur
*   **Modulär Kod:** `App.jsx` har brutits ut i självständiga komponenter (`MatrixView`, `StreamView`, `TodoView`) som sköter sin egen data.
*   **Databasutökning:** Ny tabell `settings` i SQLite för användarkonfiguration.
*   **API-optimering:** Ökat hämtningsgränsen till 50 uppgifter per kurs för att ge en mer komplett bild.

---

## [2026-01-30] - "Inbox Zero & UI-ombyggnad"

En omfattande uppdatering med fokus på effektivitet i rättningsarbetet och ett mer strukturerat användargränssnitt.

### 🚀 Nytt & Tillagt
*   **Total ombyggnad av Todo-vyn:**
    *   **Tvådelad layout:** Navigeringslista till vänster, detaljerad elevlista till höger.
    *   **Ämnesgruppering:** Uppgifter grupperas nu efter ämne (Topics) även i Todo-listan.
    *   **Tangentbordsnavigering:** Fullt stöd för `Pil Upp`/`Ned` för att bläddra mellan uppgifter.
    *   **Smart Sortering:** Nya knappar för att sortera på datum (stigande/fallande) eller alfabetiskt.
    *   **Flerdetaljer:** Inkluderar tidsstämpel för inlämning och varningsbadge för sena inlämningar.
*   **Förbättrad Stream-vy:**
    *   **Månadsgruppering:** Automatiska avsnitt per månad i flödet.
    *   **Responsiv Kalender:** Kalendern skalar nu perfekt i sidomenyn oavsett fönsterstorlek.
    *   **Längre förhandsvisning:** Tre rader text visas nu i kollapsade inlägg.
*   **Optimerad Cachning:**
    *   **Manuellt fokus:** Appen laddar nu omedelbart från `localStorage` i alla vyer.
    *   **Full kontroll:** Automatisk bakgrundsuppdatering borttagen för att spara API-kvot; användaren väljer själv när ny data ska hämtas via "Uppdatera"-knappen.
    *   **Tidsstämplar:** Uppdateringsknappen visar exakt när datan senast hämtades (vid hovring).

### 💅 Design & UX
*   **Tvåradigt Sidhuvud:** 
    *   Övre raden: Enhetlig navigering (Vy-val, Kurs, Uppdatera, Logga ut).
    *   Undre raden: Vy-specifika kontroller (Sök, Filter, Sortering, Export).
*   **Minimalistiskt UI:** Tagit bort textetiketter på knappar till förmån för ikoner och tooltips.
*   **Ultrakompakt elevlista:** Minskad radhöjd och mindre profilbilder för maximal datatäthet.
*   **Vyminne:** Appen kommer ihåg vilken vy du senast besökte.

### 🔧 Backend & Fixar
*   **API-utökning:** `/api/todos` aggregerar nu även `topics`, `studentCount` och `late`-status.
*   **Docker-fix:** Säkerställt att backenden har en giltig `package.json` för isolerade byggen.
*   **Stabilitet:** Fixat ReferenceErrors och JSX-syntaxfel efter omstrukturering.

---

## [2026-01-29] - "Matris Visualisering & UI-fixar"

Fokus låg på att göra matrisvyn mer visuell och logisk i sin hantering av uppgiftsstatusar.

### 🚀 Nytt & Tillagt
*   **Förbättrad Status-visualisering:**
    *   **Prov (Poängsatta):** Visar endast siffra (betyg) eller färgkod. Inga ikoner används för att minska bruset.
        *   Vit bakgrund: Eleven saknas i uppgiften.
        *   Mintgrön (`#f6ffed`): Eleven har lämnat in men ej fått betyg.
    *   **Uppgifter (Ej poängsatta):** Använder ikoner och färgkoder.
        *   <i class="bi bi-check"></i> **Inlämnad:** Enkel bock på mintgrön bakgrund.
        *   <i class="bi bi-check-all"></i> **Återlämnad:** Dubbelbock på grön bakgrund (`#d9f7be`).
        *   **Utkast/Påbörjad:** Endast mintgrön bakgrund (ikon borttagen).
        *   **Saknas:** Vit bakgrund (tidigare röd) för att minska stress.
*   **Nytt Filter: "Att rätta"**
    *   En checkbox i menyn som filtrerar matrisen så att endast uppgifter med obehandlade inlämningar visas.
    *   En indikerings-ikon (`bi-check-circle`) visas i summakolumnen endast när filtret är aktivt.
*   **Tydligare Summa-kolumn:**
    *   Bytt rubrikikon till `bi-bag-check` för att bättre symbolisera sammanställning/klartecken.
    *   Lagt till en tjockare vänsterkant och lätt grå bakgrund för att separera den från uppgifterna.
*   **Bättre Rubriker:**
    *   Uppgiftsrubriker tillåter nu **två rader text** innan de klipps av, vilket gör det lättare att läsa långa titlar.

### ✨ Ny Modul: Todo (Att Göra)
*   **Global Överblick:**
    *   En ny vy som aggregerar inlämnade uppgifter från *alla* aktiva kurser.
    *   Visar endast uppgifter som har status `TURNED_IN` (Väntar på rättning).
*   **Ultrakompakt Design:**
    *   En enda sorterbar tabell (nyast överst) maximerad för att visa så många rader som möjligt.
    *   Innehåller: Kurs, Elev, Uppgift, Inlämningstid och Direktlänk.
*   **Filtrering:**
    *   Fullt stöd för att filtrera listan via den globala kursväljaren i headern.
    *   Möjlighet att uppdatera listan manuellt med en "tyst" laddning (ingen blinkande skärm).

### 🐛 Buggfixar
*   **Stream:** Ökat hämtningsgränsen för inlägget från 20 till 100 för att säkerställa att hela terminens historik syns.
*   **Krasch:** Åtgärdat ett kritiskt fel där byte mellan vyer med tomt kurs-ID orsakade en krasch i Stream-vyn.
*   **Navigation:** Fixat så att Todo-vyn hanterar "Alla klassrum" korrekt och inte stör Stream/Matrix-vyerna.

---

## [2026-01-28] - "Säkerhet & Gränssnittspolering"

Andra halvan av dagen fokuserades på att göra applikationen säkrare för lärare och mer intuitiv att använda genom förbättrad visuell feedback.

### 🚀 Nytt & Tillagt
*   **Kryptering av Loggbok:**
    *   Implementerat full **AES-256-CBC-kryptering** för alla personliga anteckningar.
    *   Datan krypteras nu unikt per användare (nyckel härleds från en Master Key och Google ID).
    *   Stöd för transparent dekryptering vid läsning, med fallback för gamla okrypterade anteckningar.
*   **Export av Loggbok:**
    *   Lagt till en export-knapp i toppmenyn för Stream-vyn.
    *   Genererar en strukturerad **Markdown-fil (.md)** som inkluderar både Classroom-inlägg och privata anteckningar.
    *   Respekterar kalenderfilter för att möjliggöra export av specifika dagars planering.

### 💅 Design & UX
*   **Svenska Inforutor (Tooltips):**
    *   Lagt till förklarande texter på svenska på i stort sett alla interaktiva element (ikoner, knappar, statusar).
*   **Nya Status-ikoner i Matrisen:**
    *   Bytt ut otydliga symboler mot mer intuitiva:
        *   **Återlämnad:** Grön dubbelbock (`bi-check-all`).
        *   **Ej inlämnad:** Rödaktig cirkel med streck (`bi-dash-circle`).
*   **Visuell Feedback för Rättning:**
    *   Lagt till en gul varningsikon (<i class="bi bi-exclamation-circle-fill"></i>) i ämnes-summan om det finns nya inlämningar som väntar på bedömning.
*   **Enhetlig Design:**
    *   Gjort export-knapparna för Excel (Matrix) och Loggbok (Stream) identiska i stil och placering i headern.
*   **Lokalisering:**
    *   Översatt sökfältets placeholder till "Filtrera...".

### 🔧 Backend & Fixar
*   **Säkerhetsvarning:** Backenden varnar nu vid start om `MASTER_KEY` saknas i miljövyn.
*   **Buggfix:** Åtgärdat ett syntaxfel i Stream-vyn som orsakade byggfel efter kodomstrukturering.

---

## [2026-01-28] - "Stream, Loggbok & Persistence" (Del 1)

### 🚀 Nytt & Tillagt
*   **Modul: Stream-vy:**
    *   Implementerat ett kursflöde som hämtar **Announcements** direkt från Google Classroom.
    *   Lagt till en **Månadskalender** med stöd för **Veckonummer** och filtrering på specifika datum.
    *   Dagar med inlägg markeras automatiskt i kalendern för snabb navigering.
*   **Privat Loggbok (Agenda):**
    *   Möjlighet att skriva personliga anteckningar kopplade till varje inlägg.
    *   Fullt stöd för **Markdown** (fetstil, listor, länkar).
    *   **Split-view:** På stora skärmar visas loggboken i en sidopanel bredvid inlägget för optimalt arbetsflöde.
*   **Persistent Lagring (SQLite):**
    *   Migrerat från enbart frontend-cache till en **SQLite-databas** på servern.
    *   Anteckningar sparas säkert per användare (kopplat till unikt Google ID).
    *   Datan sparas i en persistent Docker-volym (`/data`).
*   **Matris-förbättringar:**
    *   **Relativ färgkodning:** Inlämningsstatistik visas nu i en grön-gul-röd skala baserad på klassens "bästa" resultat (istället för bara totalt antal).
    *   **Ny sortering:** Lagt till "Mest inlämnat" i sorteringsmenyn.
    *   **Minne:** Appen kommer nu ihåg det senast öppnade klassrummet mellan sessioner.

### 💅 Design & UX
*   **Kompakt Stream:** Inlägg är nu kollapsbara för att minska scrollande.
*   **Material Chips:** Bifogat material (Drive-filer, YouTube, länkar) visas som kompakta "chips" istället för stora block.
*   **Renare UI:** Filter, checkboxar och sorteringsval döljs automatiskt när man växlar från Matrix till Stream.
*   **Navigering:** Lagt till tydliga ikoner i headern för att växla mellan Matrix- och Stream-modulerna.

### 🔧 Backend & Fixar
*   **Behörigheter:** Utökat OAuth-scopes för att inkludera `announcements` och `userinfo.profile`.
*   **Buggfix:** Åtgärdat ett kritiskt fel som fick appen att krascha vid filtrering av uppgiftstyper.
*   **API:** Skapat nya endpoints för att hantera läsning och skrivning av loggboksanteckningar.

---

## [2026-01-22] - "Fullständig Omgörning" (Session 1)

Denna dag markerar en stor milstolpe där applikationen gick från prototyp till en modern, produktionsfärdig Bootstrap-applikation.

### 🚀 Nytt & Tillagt
*   **Ramverk:** Migrerade hela frontend till **Bootstrap 5** och **Bootstrap Icons**.
*   **Fullskärmslayout:** Ersatte den gamla kort-vyn med en **Fullskärms-matris** som maximerar skärmytan.
*   **Navigering:** Lade till en toppmeny med dropdown för kursval, sökfält och verktyg.
*   **Sticky Headers:** Implementerade låsta rubriker (både horisontellt och vertikalt) så man aldrig tappar bort sig i stora tabeller.
*   **Tangentbordsstyrning:** Lade till stöd för att navigera och markera elevrader med `Pil Upp` och `Pil Ned`.
*   **Export:** Lade till en knapp för att exportera aktuell vy till **CSV** (Excel-kompatibel).
*   **Data:**
    *   **Tidsstämpel:** Visar nu "Uppdaterad: HH:mm" för att indikera dataålder.
    *   **Numrering:** Lade till löpnummer (1, 2, 3...) framför elevnamn.
    *   **Ikoner:** Ersatte textstatusar (t.ex. "CREATED") med ikoner (penna) för renare look.

### 💅 Design & UX
*   **Ultrakompakt vy:** Halverade radhöjden (padding: 1px) för att få plats med hela klassen på en skärm utan scroll.
*   **Färgschema:** Uppdaterade betygskurvan till en "gladare" palett:
    *   🟢 **Godkänt:** Ljusgrön (`#d9f7be`)
    *   🌳 **Bra:** Gräsgrön (`#95de64`)
    *   🌲 **Utmärkt:** Mörkgrön (`#52c41a`) med vit text.
*   **Feedback:** Lade till laddnings-snurror (spinners) istället för texten "Laddar...".

### 🔧 Backend & Fixar
*   **OAuth Fix:** Löste `redirect_uri_mismatch` genom att göra redirect-URI dynamisk (stödjer nu `.nip.io` och andra nätverksadresser).
*   **Proxy:** Konfigurerade Nginx att skicka `Host`-headers korrekt.
*   **Loggning:** Implementerade persistent loggning till fil (`logs/backend/server.log`).

### 📚 Dokumentation
*   Skapade `INTERFACE_DOC.md` med detaljerad beskrivning av gränssnitt och logik.
*   Uppdaterade `README.md` med installationsinstruktioner.