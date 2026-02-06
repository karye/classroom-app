# Teknisk Logik & Algoritmer

Detta dokument beskriver beräkningar, datasynkronisering och systemarkitekturen.

---

## 1. Datahantering & Single Source of Truth

Applikationen använder en centraliserad modell där `App.jsx` äger allt tillstånd för att säkerställa att alla vyer alltid är synkroniserade i realtid.

### A. Den Centrala Sanningen (`App.jsx`)
Huvudkomponenten håller följande data i sitt state:
*   `allAnnouncements`: Inlägg från Classroom för alla synkroniserade kurser.
*   `allEvents`: Kalenderhändelser för alla synliga kurser.
*   `allNotes`: Alla användarens loggboksanteckningar.
*   `currentCourseData`: Detaljerad data för den för tillfället valda kursen (elever, uppgifter, submissions).

### B. Unifierad Hydrering
Vid applikationens start anropas `loadAllCachedData`. Denna funktion läser in all lagrad data från `IndexedDB` för samtliga kurser i ett svep. Detta eliminerar fördröjningar när användaren byter mellan vyer.

### C. Intelligent Realtidsmatchning
Istället för att servern räknar ut kopplingar mellan kalender och classroom, sker detta nu i webbläsaren:
1.  `EventCard` tar emot alla inlägg (`allAnnouncements`) och anteckningar (`allNotes`).
2.  Vid rendering jämförs datumet för kalenderhändelsen med datumet för inlägget (publicerat eller schemalagt) med hjälp av `isSameDay`.
3.  Ikoner visas omedelbart utan behov av ny synkronisering mot servern.

---

## 2. Synkroniserings-strategi

### A. Intelligent Kontext-synk
Uppdateringsknappen i sidhuvudet anropar `handleRefreshClick` som agerar utifrån kontext:
*   **Global vy (Schema eller Todo utan valt klassrum):** Öppnar en bekräftelsevy för att synka **allt** (Kalender + Classroom-detaljer för alla synliga kurser).
*   **Kursvy (Matrix, Stream eller Todo med valt klassrum):** Utför en fullständig uppdatering av just den valda kursens data.

### B. Kalenderkoppling (Poängbaserad Algoritm)
För att korrekt koppla kalenderhändelser till rätt kurs används ett vikta poängsystem:
*   **Sektion/Grupp:** +50 poäng.
*   **Kurskod:** +10 poäng.
*   **Namnmatchning:** +1 poäng.
*   **Felaktig sektion:** -100 poäng (förhindrar matchning mot parallella klasser).

---

## 3. Matris-logik

### Smart Summering
Systemet analyserar ämnesgrupper i matrisen för att välja bäst summeringsmetod:
*   **Kategorier med poäng:** Visar det högsta erhållna betyget (Representative Grade).
*   **Kategorier utan poäng (Övningar):** Räknar antal klara uppgifter (Completion Count).

---

## 4. Databas & Säkerhet

### A. SQLite (Backend)
Använder SQLite för persistent lagring. Tabellerna `coursework` och `announcements` har utökats med `state` och `scheduled_time` för att stödja schemalagda inlägg.

### B. Datumjämförelse
Backend använder `strftime('%Y-%m-%d', ...)` för att garantera att datummatchningar fungerar oberoende av tidszoner eller precision i tidsstämplar.
