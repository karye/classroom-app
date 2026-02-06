# Projekt Historik

Här loggas alla större förändringar i projektet "Classroom Matrix Dashboard".

## 2026-02-06
*   **Feature (Schema):** Implementerat uttoning av passerade dagar (70% opacitet) för att förbättra fokus på nuet.
*   **Feature (Schema):** Lagt till indikator (röd kalenderikon) på lektioner som har uppgifter med deadline samma dag.
*   **Feature (Sidebar):** Omarbetad sidopanel i Schemat:
    *   Kollapsbara sektioner för "Att rätta", "Anteckningar" och "Uppgifter".
    *   Ny sektion "Uppgifter (deadline idag)" som listar relevanta deadlines.
    *   Material-stöd (piller) för inlägg, med direktlänkar till Drive/YouTube.
*   **Refactor (Data):** `App.jsx` hämtar och cachar nu `allCoursework` globalt för att stödja deadline-visning i kalendern oberoende av vald kurs.
*   **Fix:** Korrigerat datumhantering för deadlines så att både API-objekt och databas-strängar hanteras korrekt.
*   **UI:** Uppdaterat ikoner för att vara enhetliga (använder `bi-journal-text` konsekvent).

## 2026-02-05
### ✨ Den Slutgiltiga Unifieringen (Arkitektur & Synk)
*   **Total Single Source of Truth:** `App.jsx` äger nu all sanning för hela applikationen. Detta inkluderar kalenderhändelser, flödesinlägg, betyg och privata anteckningar. All data delas i realtid mellan alla vyer.
*   **Intelligent Realtidsmatchning:** Schemavyn (kalendern) räknar nu ut sina egna ikoner för inlägg och anteckningar direkt i webbläsaren. Detta innebär att en synk i flödet omedelbart syns i kalendern utan att schemat behöver laddas om.
*   **Smart Synk-motor:** Likriktat alla "Uppdatera"-knappar. Knappen i sidhuvudet förstår nu kontexten: står du i en kurs uppdateras allt för den kursen; står du i en global vy (Schema/Todo) triggas en global synk för alla aktiva kurser.
*   **Unifierad Hydrering:** Vid start läser appen nu in all cachad data för samtliga kurser samtidigt. Detta gör att alla vyer är "varma" och redo med information direkt vid inloggning.
*   **Säkrare API:** Utökat händelse-API:et till att inkludera `course_id` för varje lektion för att garantera 100% exakt matchning mot Classroom-data.

### 🎨 Design & UX (Finputsning)
*   **Interaktiv Lektionslogg:** Klick på en lektion i schemat öppnar nu en detaljerad "Lektionslogg" i sidopanelen. Här kan läraren läsa Classroom-inlägg och sina egna privata anteckningar sida vid sida med uppgifter som ska rättas.
*   **Förbättrad Kalenderlayout:**
    *   Rensat bort tekniska kurskoder från lektionskorten.
    *   Gruppnamn (t.ex. TE23A) används nu som tydlig huvudrubrik.
    *   Markering av vald lektion med tjock svart kant, skalning och skugga.
*   **Städad Sidopanel:** Ny visuell hierarki med kursfärgade piller, tydliga sektioner ("Att rätta i kursen" och "Anteckningar") och strikt följsamhet till svenska skrivregler (meningsversal).
*   **Statusrad 2.0:** Flyttat texten "Uppdaterad HH:mm" från sidhuvudet till den globala statusraden längst ner för ett renare gränssnitt.
*   **Stöd för Schemalagda Inlägg:** Appen hämtar och visar nu även schemalagda inlägg (drafts) i både flödet och kalendern. Dessa markeras med en tydlig gul badge.
*   **Smart Matris-summa:** Matrisen känner nu av om en grupp innehåller poänguppgifter eller inte. För övriga grupper (t.ex. övningar) visas nu antal klara uppgifter istället för att felaktigt visa 0 i betyg.

### 🛠 Buggfixar & Stabilitet
*   **Loop-skydd:** Åtgärdat en "feedback-loop" i schemavyn där rapportering av laddningsstatus triggade oändliga omrenderingar.
*   **Referenssäkerhet:** Omstrukturerat `App.jsx` för att eliminera `ReferenceError` vid uppstart genom att garantera korrekt initieringsordning.
*   **Datum-robusthet:** Bytt till `strftime` i backenden för att säkerställa korrekt datummatchning oavsett tidszoner eller millisekunder.

---

## 2026-02-03
### ✨ Nya Funktioner
*   **Elevregister 2.0 (SchoolSoft-import):**
    *   **Robust Import:** Strikt validering av format (Nr/Klass/Namn) och automatisk detektering av 2- eller 3-kolumnslistor.
    *   **Säkerhet:** Sekventiell databashantering för att förhindra server-låsningar vid stora importer.
    *   **Tvåstegsimport:** Steg 1: Råimport av text (blixtsnabb). Steg 2: Manuell koppling och matchning mot Google Classroom.
    *   **Smart Matchning:** Poängbaserad algoritm som matchar namn ("Efternamn Förnamn" ↔ "Förnamn Efternamn") med stöd för svenska tecken och accenter.
    *   **Hantering:** Vy med två kolumner för att bläddra bland grupper, se elever, radera kopplingar eller hela grupper.
    *   **Feedback:** Tydliga ikoner (Grön/Gul gubbe) visar matchningsstatus direkt i listan.
*   **Inställningar 2.0:** Flyttat inställningar från en modal till en **egen fullskärmsvy**.
    *   Lagt till flikar: "Anpassning", "Systemdata" och "Elevregister".
    *   **Systemdata:** Ny dashboard som visar databasstorlek, cache-status och server-anteckningar per kurs.
    *   Möjlighet att rensa cache för specifika kurser.

### 🎨 Design & UX
*   **Enhetlig Elevvisning:** Standardiserat format `Namn (Klass)` i Matris, Todo och Inställningar.
*   **Centraliserad CSS:** Skapat globala klasser (`.student-meta`, `.course-list-item`) för enhetligt utseende och enklare underhåll.
*   **Förbättrad Feedback:** Bytt ut `alert()` mot informativa modaler för importresultat och raderingsbekräftelse.

### 🛠 Arkitektur & Refaktorisering
*   **Komponentuppdelning:** Brutit ut den massiva `SettingsView.jsx` i mindre, mer lätthanterliga filer:
    *   `GeneralSettings.jsx` (Filter & Kurser)
    *   `SystemStats.jsx` (Lagring & Data)
    *   `StudentRegistry.jsx` (Import & Grupphantering)
*   **Databasförbättringar:** Lagt till tabeller för `student_classes` och `group_mappings` samt automatisk schema-migration i backend.

### ⚡ Förbättringar & Optimering
*   **Smart Kalender-matchning:** Implementerat en **poängbaserad algoritm** i backend för att koppla kalenderhändelser till rätt kurs.
    *   Straffar felaktiga sektionskoder (t.ex. EE22A vs EE22B) för att förhindra ihopblandning.
*   **Optimerad Global Synk:** Synkar nu bara ID på *synliga* kurser, vilket snabbar upp processen för lärare med många gamla kurser.
*   **Kalender-interaktion:**
    *   **Todo-räknare:** Röd siffra på lektioner visar antal väntande inlämningar.
    *   Klick på lektion filtrerar sidopanelen på den specifika kursen.

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
*   **API-utökning:** `/api/todos` och `/api/courses/:id/todos` returnerar nu `maxPoints` for varje uppgift.
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
    *   Ny inställningsfönster (Bootstrap 5 Modal) via kugghjul i headern.
    *   **Sökordsfilter:** Dölj uppgifter eller hela ämnen baserat på sökord (t.ex. "Närvaro").
    *   **Server-lagring:** Inställningar sparas i serverns SQLite-databas och synkas mellan enheter.
*   **Förbättrad Matris-vy:**
    *   **Elevsammanställning:** Klicka på en elev för att se ett snyggt "betygskort" med alla resultat.
    *   **Utskriftsoptimering:** Specifika stilar för utskrift av elevsammanställningar.