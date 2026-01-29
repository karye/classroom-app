# 🗺️ Projekt Roadmap & Framtidsvision

Detta dokument beskriver den planerade utvecklingen för **Classroom Matrix Dashboard**. Syftet är att ge en överblick över kommande funktioner och förbättringsområden.

---

## 📅 Fas 1: Polering & Anpassning (Kort sikt)
*Fokus på att göra nuvarande funktioner mer flexibla och användarvänliga.*

### ⚙️ Konfigurerbara Gränser
*   **Mål:** Låt läraren själv bestämma betygsgränserna.
*   **Funktion:** En inställningspanel där användaren kan sätta gränser för färgerna (t.ex. ändra E-gräns från 50% till 60%) och tröskelvärdet för "Risk"-varning.

### 🔍 Sök & Filtrering i Loggbok
*   **Mål:** Gör det lättare att hitta gamla anteckningar.
*   **Funktion:** Utöka sökfältet i Stream-vyn så att det även söker i dina *privata anteckningar* (SQLite), inte bara i Google-inläggen.

### 🌙 Dark Mode
*   **Mål:** Bättre ergonomi vid kvällsarbete.
*   **Funktion:** Ett globalt tema-switch som byter gränssnittet till mörka färger.

---

## 📈 Fas 2: Djupare Analys & Data (Medellång sikt)
*Fokus på att ge läraren insikter om trender och elevhälsa.*

### 📊 Elevkort & Trendanalys
*   **Mål:** Se en elevs utveckling över tid.
*   **Funktion:** Klicka på ett elevnamn för att öppna en modal/sida som visar en graf över inlämningar och resultat de senaste månaderna.

### ⚠️ Utökad Risk-analys
*   **Mål:** Tidigare upptäckt av elever som halkar efter.
*   **Funktion:** Analysera inlämningsmönster. Varna inte bara för låga betyg, utan även för *brutna trender* (t.ex. "Eleven har inte lämnat in något på 2 veckor").

### 📥 Export av Loggbok
*   **Mål:** Kunna ta med sig planeringen.
*   **Funktion:** Exportera loggboken/agendan till PDF eller direkt till ett Google Doc för utskrift eller arkivering.

---

## 🤖 Fas 3: Integration & AI (Lång sikt)
*Fokus på att automatisera manuellt arbete.*

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
