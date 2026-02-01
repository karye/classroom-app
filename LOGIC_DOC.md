# Teknisk Logik & Algoritmer

Detta dokument beskriver beräkningar, datasynkronisering och systemarkitekturen.

---

## 1. Kalender & Schema (Global Synk)

Applikationen använder en avancerad strategi för att bygga det globala schemat (`ScheduleView`).

### A. Datakällor
Systemet hämtar data från två källor via Google Calendar API:
1.  **Kurskalendrar:** Varje Classroom-kurs har en specifik kalender.
2.  **Primär kalender:** Lärarens huvudkalender, där schemasynk-system (t.ex. Skola24) ofta lägger in lektioner.

### B. Smart Sökning (Reconciliation)
För att hitta rätt händelser i den primära kalendern använder backend en "fuzzy matching"-algoritm:
1.  **Analys:** För varje aktiv kurs analyseras Namn och Sektion (Avsnitt).
2.  **Extrahering:** Vi letar efter mönster som liknar kurskoder (t.ex. `PRRPRR01`, `TE23A`) med RegEx.
3.  **Filtrering:** Alla händelser i primärkalendern hämtas (senaste 3 mån) och filtreras lokalt. En händelse inkluderas om dess titel eller beskrivning matchar någon av kursens identifierare.

### C. Layout-algoritm (Visualisering)
För att visa schemat snyggt används en "Packing Algorithm":
1.  **Klustring:** Händelser som överlappar i tid grupperas ihop.
2.  **Kolumner:** Inom varje kluster fördelas händelserna i kolumner för att maximera bredden utan att överlappa visuellt.
3.  **Resultat:** Lektioner som krockar visas sida-vid-sida, medan ensamma lektioner tar upp hela bredden.

---

## 2. Uppgiftslogik & Visualisering

### A. Status-hantering
Systemet normaliserar status från Google Classroom till en intern modell:
*   `TURNED_IN` -> **Action Needed** (Visas ofta grönt/blått).
*   `RETURNED` -> **Done** (Visas som betyg eller klar-markering).
*   `CREATED` -> **Pending** (Ej inlämnad).

### B. Matrisen
Använder en kompakt visning:
*   **Ikoner:** Används i rutnätet för att spara plats.
*   **Färg:** Cellens bakgrundsfärg styrs av status (Ljusblå = Inlämnad) eller resultat (Heatmap).

---

## 3. API & Prestanda

### Rate Limiting (Concurrency Control)
För att undvika "Quota Exceeded":
*   **Kö-system:** Max 3 kurser bearbetas parallellt globalt.
*   **Throttling:** Max 10 förfrågningar samtidigt per kurs, med 50ms fördröjning.

### Offline-First & Caching
*   **IndexedDB:** All data (Kurser, Inlägg, Matris, Schema) sparas lokalt.
*   **Felhantering:** Om API:et returnerar fel (t.ex. 404 eller nätverksfel) vid en uppdatering, *behålls* den cachade datan på skärmen för att tillåta fortsatt arbete.

---

## 4. Säkerhet

*   **Kryptering:** Loggboksanteckningar krypteras med AES-256-CBC innan de sparas i SQLite-databasen.
*   **Auth:** OAuth 2.0 används för all kommunikation med Google. Token sparas i en krypterad session-cookie.

---

## 5. Användarinställningar & Filtrering

Systemet erbjuder granulär kontroll över vilken data som visas genom persistenta inställningar.

### Kursfiltrering (Globalt)
*   **Modell:** En lista med `hiddenCourseIds` sparas i användarens inställningar (SQLite).
*   **Implementering:**
    *   **Frontend:** Applikationen filtrerar bort kurser vars ID finns i denna lista *innan* de renderas i menyer eller skickas till vyer.
    *   **Dashboard:** "Top-5 Att Rätta" i schemat kontrollerar varje uppgift mot listan av synliga kurser för att säkerställa att dolda kurser inte genererar notiser.
*   **Syfte:** Låter lärare dölja arkiverade eller irrelevanta kurser utan att ta bort dem från Google Classroom.

### Innehållsfilter (Lokalt)
*   **Nyckelord:** Användaren kan definiera ord som exkluderar specifika uppgifter eller ämnen.
*   **Logic:** Frontend-komponenterna (Todo, Matrix) itererar över all data och hoppar över objekt som matchar filtren innan rendering.

---

## 6. Prestanda & UX

### Vyminne (View Memory)
*   **Logik:** Applikationen sparar det senast aktiva `courseId` separat för varje vy (`matrix`, `stream`) i `localStorage`.
*   **Beteende:** När användaren byter vy återställs det senaste valet. Om inget val finns (t.ex. vid första besök eller om kursen dolts), väljs automatiskt den första synliga kursen i listan.

### Memoization
*   **Optimering:** Tunga beräkningar i Todo-vyn (sortering, gruppering av hundratals uppgifter) och kursfiltrering i huvudappen är inslagna i `React.useMemo`.
*   **Resultat:** Eliminerar "frysningar" av gränssnittet vid navigering och förhindrar onödiga omladdningar av komponenter.


