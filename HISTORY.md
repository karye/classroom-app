# Projekt Historik

Här loggas alla större förändringar i projektet "Classroom Matrix Dashboard".

## [2026-01-28] - "Stream, Loggbok & Persistence"

Idag expanderades applikationen från en ren matrisvy till ett mer komplett arbetsverktyg med stöd för flöden, personlig planering och stabilare lagring.

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