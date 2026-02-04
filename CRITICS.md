# Codebase Review & Framtidsanalys
*Dokumenterad: 2026-02-03*

Denna fil innehåller en teknisk granskning av applikationen, identifierade svagheter och en färdplan för framtida arkitektoniska förbättringar.

## 1. Nulägesanalys

Applikationen är en fullstack React/Node.js-lösning som löser ett komplext problem: integrering av Google Classroom, Kalender och lokala skolregister (SchoolSoft).

### ✅ Styrkor
*   **Modularitet:** Efter refaktoriseringen i februari 2026 är koden väl uppdelad. Backend är separerad i `routes/` och `services/`. Frontend är uppdelad i domän-specifika komponenter (`schedule/`, `matrix/`, `settings/`) och logik-hooks.
*   **Offline-First:** Användningen av `IndexedDB` i frontend gör applikationen snabb och motståndskraftig mot nätverksproblem.
*   **Domän-fokus:** Datan och vyerna är tydligt modellerade efter lärarens behov ("Att rätta", "Klasser", "Schema").
*   **Robusthet:** Import-funktionen för elevregister är byggd för att hantera felaktig indata och stora datamängder utan att krascha servern.

### ⚠️ Svagheter & Risker
*   **Typning (Saknas):** Projektet är skrivet i ren JavaScript. Detta ökar risken för runtime-fel (`undefined is not a function`) och gör refaktoriseringar riskabla då datastrukturer (t.ex. `student`-objektet) är implicita.
*   **Objektorientering (Svag):** Koden är procedurell. Data skickas runt som råa JSON-objekt. Det saknas klasser/modeller som kapslar in affärslogik (t.ex. `student.isAtRisk()`).
*   **Backend State:** Sessioner hanteras via cookies, men tunga operationer (som Google-importen) är beroende av serverns minne och tid.
*   **Testning:** Det saknas helt automatiska enhetstester och integrationstester.

---

## 2. Förslag på Förbättringar

### A. Typsäkerhet (TypeScript)
Detta är den enskilt viktigaste åtgärden för att säkra kodbasen långsiktigt.
*   **Mål:** Migrera `.js/.jsx` till `.ts/.tsx`.
*   **Nytta:** Fånga fel vid kompilering, bättre IDE-stöd, tydlig dokumentation av datastrukturer.

### B. Domänmodeller (DDD)
Gå från att hantera rådata till att använda rika objekt/klasser.
*   **Exempel:**
    *   Skapa en `Student`-klass som vet hur den ska formatera sitt namn och beräkna sitt snittbetyg.
    *   Skapa en `Assignment`-klass som vet om den är "sen" eller "inlämnad".
*   **Plats:** `common/models/` (kan delas mellan frontend/backend om man kör monorepo-struktur eller delade paket).

### C. State Management (React Context)
Just nu skickas globalt tillstånd (`courses`, `refreshTrigger`) ner genom props ("prop drilling") i `App.jsx`.
*   **Förslag:** Inför en `AppContext` eller använd ett state-bibliotek (Zustand/Redux).
*   **Nytta:** Komponenter som `SettingsView` kan hämta data direkt från context utan att belasta `App.jsx`.

### D. Teststrategi
För att kunna refaktorera säkert behövs skyddsnät.
*   **Steg 1:** Skriv enhetstester för `utils/`-filerna (`matrixUtils.js`, `calendarLayout.js`) med Jest/Vitest.
*   **Steg 2:** Skriv API-tester för backend-routsen.

---

## 3. Färdplan (Roadmap)

### Fas 1: Konsolidering (Nuvarande)
*   Säkerställ att nuvarande refaktorisering är stabil.
*   Fixa mindre UI-buggar och polera UX.

### Fas 2: Typsäkerhet (Nästa stora steg)
*   Sätt upp TypeScript-konfiguration.
*   Definiera Interfaces för kärnobjekten: `Student`, `Course`, `Submission`.
*   Migrera hjälpfunktioner (`utils/`) först.

### Fas 3: Arkitekturlyft
*   Inför `Service Layer` mönstret fullt ut i backend (Separera logik från HTTP-anrop).
*   Inför React Context för global state.

### Fas 4: Kvalitetssäkring
*   Implementera CI/CD pipeline som kör tester och linting.
*   Skriv tester för kritisk affärslogik (betygssättning, import).