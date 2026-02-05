# Teknisk Logik & Algoritmer

Detta dokument beskriver beräkningar, datasynkronisering och systemarkitekturen.

---

## 1. Datahantering & Vattenfallsmodellen (Single Source of Truth)

Applikationen använder nu en strikt hierarkisk modell för datahämtning och lagring för att säkerställa att alla vyer (`Matrix`, `Stream`, `Todo`) alltid är synkroniserade.

### A. Den Centrala Sanningen (`App.jsx`)
All data om det aktuella klassrummet bor nu i ett centralt state i huvudkomponenten. 
*   **Realtid:** När en vy triggar en synk uppdateras huvudkomponenten, vilket gör att ändringen slår igenom i alla flikar samtidigt.
*   **Enhetlighet:** Inga vyer har längre egna kopior av data i arbetsminnet.

### B. Vattenfalls-algoritmen
Varje gång ett klassrum väljs eller synkas följs denna kedja:
1.  **Steg 1 (Lokal Cache):** Systemet kollar i webbläsarens `IndexedDB`. Finns data visas den blixtsnabbt.
2.  **Steg 2 (Backend Databas):** Om cachen är tom hämtas data från serverns `SQLite`-databas. Denna data sparas i cachen och visas.
3.  **Steg 3 (Google API):** Endast vid manuell synk (`?refresh=true`) hämtas färsk data från Google. Resultatet speglas först till SQLite, sedan till cachen och slutligen till huvudappen.

### C. Enhetlig Endpoint
Endpointen `/api/courses/:courseId/details` är nu den "stora" källan som returnerar allt: elever, uppgifter, inlämningar, topics, announcements och **gradeCategories** i ett enda JSON-objekt.

### D. Stöd för Betygskategorier
Systemet hämtar nu kursens betygskategorier (t.ex. Prov, Uppgift, Övning) från Google Classroom.
*   **Koppling:** Varje uppgift kopplas till sin kategori via `gradeCategory.id`.
*   **Smart kategorisering:** Uppgifter utan kategori i Classroom grupperas automatiskt som "Övningar".

---

## 2. Kalender & Schema (Global Synk)

Applikationen använder en avancerad strategi för att bygga det globala schemat (`ScheduleView`).

### A. Datakällor
Systemet hämtar data från två källor via Google Calendar API:
1.  **Kurskalendrar:** Varje Classroom-kurs har en specifik kalender.
2.  **Primär kalender:** Lärarens huvudkalender, där schemasynk-system (t.ex. Skola24) ofta lägger in lektioner.

### B. Separerad Synk
För att bibehålla hög prestanda är schemats synkning nu helt fokuserad på kalenderhändelser. 
*   **Fokus:** Synkar endast lektioner från Google Kalender.
*   **Lokal Dashboard:** "Att rätta"-listan i schemat läser från den lokala databasen istället för att tvinga fram en global Google-synk för alla kurser.

### C. Smart Sökning (Poängbaserad Algoritm)
För att korrekt koppla kalenderhändelser till rätt kurs (särskilt vid parallella kurser med samma kod, t.ex. "PRRPRR01") används ett vikta poängsystem:

1.  **Analys:** Varje aktiv kurs analyseras för att hitta nyckelord (Kurskod, Grupp/Sektion).
2.  **Poängsättning:** Varje händelse i kalendern poängsätts mot varje kurs:
    *   **+50 poäng:** Exakt matchning av **Sektion/Grupp** (t.ex. "EE22A"). Detta väger tyngst.
    *   **+10 poäng:** Matchning av **Kurskod** (t.ex. "PRRPRR01").
    *   **+1 poäng:** Matchning av ord i kursnamnet.
    *   **-100 poäng (Straff):** Om händelsen innehåller en sektionskod som tillhör en *annan* kurs. Detta diskvalificerar felaktiga matchningar.
3.  **Resultat:** Kursen med högst poäng (>0) vinner händelsen.

---

## 3. Systemstabilitet & Återställning

### A. Nuclear Reset (Total Nollställning)
Nollställningsfunktionen i inställningarna har byggts om för att vara maximalt robust:
1.  **Sekventiell radering:** Alla tabeller raderas (`DROP TABLE`) i en garanterad ordning för att rensa bort eventuella inkompatibla scheman.
2.  **Återskapande:** Databasens struktur byggs upp från grunden igen via en re-runnable `reinitSchema`-funktion.
3.  **Migrationer:** Automatiska databasmigrationer säkerställer att alla nödvändiga kolumner finns på plats direkt efter start.

---

## 4. Cachnings-strategi

*   **Gemensam nyckel:** `MatrixView` och `StreamView` delar nu på samma cache-nyckel (`course_cache_ID`).
*   **Aggregerad Todo-cache:** `TodoView` har en egen global cache för "Alla klassrum"-läget, men växlar automatiskt till den centrala sanningen när en enskild kurs väljs.

---

## 4. Prestanda & UX

### Enhetligt Kursval (Global Course ID)
*   **Logik:** Appen har nu tagit bort "vyminnet" (olika kurser i olika flikar). 
*   **Beteende:** Samma kurs förblir vald oavsett om du växlar mellan Matris, Stream eller Todo. Detta minskar kognitiv belastning och förhindrar ihopblandning av data.

### Enhetlig Statusbar
*   **Feedback:** All synk-feedback har flyttats till en global `StatusBar` längst ner.
*   **Diskretion:** Stora laddningssnurror har tagits bort till förmån för textmeddelanden i statusbaren, vilket gör att användaren kan fortsätta arbeta medan data hämtas i bakgrunden.