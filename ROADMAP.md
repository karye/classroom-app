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

---

## ✅ Avklarat & Genomfört

*   **Migration till IndexedDB:** Fullt stöd för stora datamängder utan webbläsarbegränsningar.
*   **Globala Filter:** Möjlighet att dölja specifika uppgifter och ämnen.
*   **Elevsammanställning:** Snyggt "betygskort" med alla resultat, redo för utskrift.
*   **Persistent Settings:** Inställningar sparas nu på servern per användare.
*   **Modulär arkitektur:** Renare kodbas med dedikerade vy-komponenter.

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
