# Teknisk Logik & Algoritmer

Detta dokument beskriver beräkningar, datasynkronisering och systemarkitekturen.

---

## 1. Kalender & Schema (Global Synk)

Applikationen använder en avancerad strategi för att bygga det globala schemat (`ScheduleView`).

### A. Datakällor
Systemet hämtar data från två källor via Google Calendar API:
1.  **Kurskalendrar:** Varje Classroom-kurs har en specifik kalender.
2.  **Primär kalender:** Lärarens huvudkalender, där schemasynk-system (t.ex. Skola24) ofta lägger in lektioner.

### B. Smart Sökning (Poängbaserad Algoritm)
För att korrekt koppla kalenderhändelser till rätt kurs (särskilt vid parallella kurser med samma kod, t.ex. "PRRPRR01") används ett vikta poängsystem:

1.  **Analys:** Varje aktiv kurs analyseras för att hitta nyckelord (Kurskod, Grupp/Sektion).
2.  **Poängsättning:** Varje händelse i kalendern poängsätts mot varje kurs:
    *   **+50 poäng:** Exakt matchning av **Sektion/Grupp** (t.ex. "EE22A"). Detta väger tyngst.
    *   **+10 poäng:** Matchning av **Kurskod** (t.ex. "PRRPRR01").
    *   **+1 poäng:** Matchning av ord i kursnamnet.
    *   **-100 poäng (Straff):** Om händelsen innehåller en sektionskod som tillhör en *annan* kurs. Detta diskvalificerar felaktiga matchningar.
3.  **Resultat:** Kursen med högst poäng (>0) vinner händelsen.

### C. Layout-algoritm (Visualisering)
För att visa schemat snyggt används en "Packing Algorithm":
1.  **Klustring:** Händelser som överlappar i tid grupperas ihop.
2.  **Kolumner:** Inom varje kluster fördelas händelserna i kolumner för att maximera bredden utan att överlappa visuellt.
3.  **Resultat:** Lektioner som krockar visas sida-vid-sida, medan ensamma lektioner tar upp hela bredden.

### D. Elevkoppling & Namnmatchning (SchoolSoft-import)
Eftersom Google Classroom inte vet vilken "klass" (t.ex. TE23b) en elev går i, används en importmodul:

1.  **Steg 1 (Raw Import):** Text parsas för att hitta rader som börjar med siffror. Namn och klass sparas med ett `TEMP_ID` i databasen.
2.  **Steg 2 (Matching):** När en användare kopplar gruppen till en Google-kurs hämtas kursens deltagarlista.
3.  **Algoritm:** Namn normaliseras (små bokstäver, inga specialtecken, bokstäverna sorteras alfabetiskt). Detta gör att "López Sandor" matchar "Sandor Lopez" tillförlitligt.
4.  **Uppdatering:** Vid matchning byts `TEMP_ID` ut mot elevens riktiga `google_id`, vilket aktiverar klassvisningen i hela appen.

---

## 2. Uppgiftslogik & Visualisering

### A. Status-hantering
Systemet normaliserar status från Google Classroom till en intern modell:
*   `TURNED_IN` -> **Action Needed** (Visas ofta grönt/blått).
*   `RETURNED` -> **Done** (Visas som betyg eller klar-markering).
*   `CREATED` -> **Pending** (Ej inlämnad).

### B. Matrisen & Todo (Enhetlig Filtrering)
Båda vyerna använder nu samma logik för att filtrera uppgifter:
*   **Graded (Prov):** Uppgifter där `maxPoints > 0`.
*   **Ungraded (Uppgifter):** Uppgifter utan poäng eller `maxPoints = 0` (om API stödjer det).
*   **Filtrering:** Användaren kan välja att se "Alla", "Endast Graded" eller "Endast Ungraded".

---

## 3. API & Prestanda

### Optimerad Global Synk
För att snabba upp laddningstider vid "Global Synk" (Schema-vyn):
1.  **Frontend:** Skickar en lista med ID:n för alla *synliga* kurser (baserat på användarens filter).
2.  **Backend:** Filtrerar bort alla kurser som inte finns i listan *innan* några API-anrop görs mot Google Classroom.
3.  **Effekt:** Gamla/dolda kurser belastar inte systemet, vilket drastiskt minskar tiden för uppdatering.

### Rate Limiting (Concurrency Control)
För att undvika "Quota Exceeded":
*   **Kö-system:** Max 3 kurser bearbetas parallellt globalt.
*   **Throttling:** Max 10 förfrågningar samtidigt per kurs, med 50ms fördröjning.

### Offline-First & Caching
*   **IndexedDB:** All data (Kurser, Inlägg, Matris, Schema) sparas lokalt.
*   **Statistik:** Applikationen kan nu beräkna och visa exakt hur mycket plats cachen tar per kurs via `/api/stats`.

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

### Vy-specifika Filter (LocalStorage)
Följande filter sparas lokalt i webbläsaren för att minnas användarens val:
*   `matrix_hide_nodeadline`: Dölj uppgifter utan deadline i matrisen.
*   `todo_hide_nopoints`: Dölj uppgifter utan poäng i Todo-vyn.
*   `todo_hide_empty`: Dölj uppgifter utan inlämningar.

---

## 6. Prestanda & UX

### Vyminne (View Memory)
*   **Logik:** Applikationen sparar det senast aktiva `courseId` separat för varje vy (`matrix`, `stream`) i `localStorage`.
*   **Beteende:** När användaren byter vy återställs det senaste valet. Om inget val finns (t.ex. vid första besök eller om kursen dolts), väljs automatiskt den första synliga kursen i listan.

### Memoization
*   **Optimering:** Tunga beräkningar i Todo-vyn (sortering, gruppering av hundratals uppgifter) och kursfiltrering i huvudappen är inslagna i `React.useMemo`.
*   **Resultat:** Eliminerar "frysningar" av gränssnittet vid navigering och förhindrar onödiga omladdningar av komponenter.