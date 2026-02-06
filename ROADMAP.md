# 🗺️ Projekt Roadmap & Framtidsvision

Detta dokument beskriver den planerade utvecklingen för **Classroom Matrix Dashboard**. Syftet är att ge en överblick över kommande funktioner och förbättringsområden.

---

## 📅 Fas 1: Polering & Fördjupning (Kort sikt)
*Fokus på att göra nuvarande insikter mer användbara.*

### 🔍 Avancerad Sökning
*   **Mål:** Hitta info snabbt i stora kurser.
*   **Funktion:** Utöka sökfältet i Stream-vyn så att det även söker i dina *privata anteckningar* (SQLite), inte bara i Google-inläggen.

### 🌙 Dark Mode
*   **Mål:** Bättre ergonomi vid kvällsarbete.
*   **Funktion:** En global tema-switch som byter gränssnittet till mörka färger.

---

## 📈 Fas 2: Trendanalys & Kommunikation (Medellång sikt)
*Fokus på att ge läraren insikter om utveckling över tid.*

### 📊 Historiska grafer
*   **Mål:** Se en elevs utveckling grafiskt.
*   **Funktion:** Utöka elevsammanställningen med en enkel graf över inlämningsfrekvens och resultat jämfört med klassens snitt.

### ⚠️ Utökad Risk-analys
*   **Mål:** Tidigare upptäckt av elever som halkar efter.
*   **Funktion:** Analysera inlämningsmönster. Varna inte bara för låga betyg, utan även för *brutna trender* (t.ex. "Eleven har inte lämnat in något på 2 veckor").

### ☑️ Snabb-återlämning (Quick-Return)
*   **Mål:** Minska antalet klick för att hantera vardagliga inlämningar.
*   **Funktion:** Markera som "Klar" direkt i appen.
    *   En "Check"-knapp i Todo-vyn och Matrisen för inlämnade uppgifter.
    *   Vid klick anropas Google Classroom API för att "Returnera" uppgiften till eleven.
    *   **Studybee-integration:** Eftersom Studybee läser från Classroom, kommer bedömningen att synas där automatiskt vid nästa synk.

---

## ✅ Avklarat & Genomfört

*   **Den stora unifieringen:** `App.jsx` är nu den enda källan till sanning för all data (Schema, Stream, Betyg).
*   **Intelligent synkronisering:** Enhetlig uppdateringslogik som förstår kontexten.
*   **Realtidslogik i kalendern:** Inlägg och anteckningar matchas direkt i webbläsaren.
*   **Lektionslogg:** Se Classroom-inlägg och privata anteckningar direkt i schemat.
*   **Stöd för framtiden:** Visning av schemalagda inlägg i flödet och kalendern.
*   **Migration till IndexedDB:** Fullt stöd för stora datamängder utan webbläsarbegränsningar.
*   **Globala filter:** Möjlighet att dölja specifika uppgifter och ämnen.
*   **Elevsammanställning:** Snyggt "betygskort" med alla resultat, redo för utskrift.
*   **Persistent settings:** Inställningar sparas nu på servern per användare.

---

## 🤖 Fas 3: Integration & AI (Lång sikt)
*Fokus på att automatisera manuellt arbete.*

### 📚 Avancerad Lektionshantering (Ny!)
*   **Mål:** Sluta cirkeln mellan planering, genomförande och reflektion.
*   **Funktion:** **Loggbok i Kalendern.**
    *   Koppla loggboksanteckningar från Stream-vyn automatiskt till motsvarande lektion i kalendern baserat på tidsstämpel.
    *   Lektioner i Schema-vyn som har en tillhörande logg får en ikon (📝).
    *   **Resultat:** Läraren kan bläddra bakåt i schemat och direkt se *vad* som gjordes och *hur* det gick på varje lektion, utan att leta i flödet.

#### 🏗️ Teknisk Arkitektur för Lektionshantering
För att överbrygga gapet mellan Google Classroom (Stream) och Google Calendar (Schema) implementeras en "Smart Brygga" i applikationens databas.

1.  **Databasmodell (`lesson_logs`):**
    *   En ny SQLite-tabell skapas för att lagra kopplingen.
    *   `id`: Primärnyckel.
    *   `course_id`: ID för kursen (för filtrering).
    *   `event_id`: Googles unika ID för kalenderhändelsen (den "hårda" länken).
    *   `content`: Markdown-texten (krypterad).
    *   `created_at`: Tidsstämpel.

2.  **Smart Context (I Stream-vyn):**
    *   När användaren öppnar loggboken i Stream-vyn hämtar systemet dagens kalenderhändelser för den aktuella kursen.
    *   **Auto-matchning:** Om klockan är nära en lektionstid (eller nyss passerad), föreslår systemet automatiskt den lektionen.
    *   **Manuell override:** En dropdown ("Vilken lektion loggar du?") tillåter val av andra lektioner samma dag/vecka om matchningen misslyckas.

3.  **Visualisering (I Schema-vyn):**
    *   Vid rendering av schemat görs en slagning mot `lesson_logs` baserat på `event_id`.
    *   Matchade lektioner renderas med en dokument-ikon.
    *   **Interaktion:**
        *   *Hover:* Tooltip med de första raderna av texten.
        *   *Klick:* Öppnar en modal för att läsa/redigera hela loggen.

### 🤖 AI-assistans
*   **Mål:** Spara tid vid inläsning av långa flöden.
*   **Funktion:** En "Sammanfatta"-knapp som använder en LLM för att sammanfatta långa diskussioner eller instruktioner i ett inlägg.

### 📅 Kalender-synk
*   **Mål:** Synka planering med schemat.
*   **Funktion:** Möjlighet att pusha anteckningar från Loggboken ("Agenda") direkt till sin Google Calendar som en händelse.

### 📝 Mallar för Loggbok
*   **Mål:** Strukturera lektionsplaneringen.
*   **Funktion:** Färdiga mallar (t.ex. "Lektionsstruktur", "Att göra", "Reflektion") som man kan infoga i sin loggbok med ett klick.

---

## 🛠 Tekniska Förbättringar (Löpande)

*   **Offline-stöd (PWA):** Gör appen installerbar och cacha data så man kan läsa sin planering även om nätet går ner i klassrummet.
*   **Testning:** Införa enhetstester (Vitest) och integrationstester för att säkra kvalitén vid framtida uppdateringar.
*   **Databas-migrering:** Om antalet användare växer, förbered migration från SQLite till PostgreSQL.
