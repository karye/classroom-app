# Projekt Historik

Här loggas alla större förändringar i projektet "Classroom Matrix Dashboard".

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