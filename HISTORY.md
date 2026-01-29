# Projekt Historik

Här loggas alla större förändringar i projektet "Classroom Matrix Dashboard".

## [2026-01-29] - "Matris Visualisering & UI-fixar"

Fokus låg på att göra matrisvyn mer visuell och logisk i sin hantering av uppgiftsstatusar.

### 🚀 Nytt & Tillagt
*   **Förbättrad Status-visualisering:**
    *   **Prov (Poängsatta):** Visar endast siffra (betyg) eller färgkod. Inga ikoner används för att minska bruset.
        *   Vit bakgrund: Eleven saknas i uppgiften.
        *   Mintgrön (`#f6ffed`): Eleven har lämnat in men ej fått betyg.
    *   **Uppgifter (Ej poängsatta):** Använder ikoner och färgkoder.
        *   <i class="bi bi-check"></i> **Inlämnad:** Enkel bock på mintgrön bakgrund.
        *   <i class="bi bi-check-all"></i> **Återlämnad:** Dubbelbock på grön bakgrund (`#d9f7be`).
        *   **Utkast/Påbörjad:** Endast mintgrön bakgrund (ikon borttagen).
        *   **Saknas:** Vit bakgrund (tidigare röd) för att minska stress.
*   **Nytt Filter: "Att rätta"**
    *   En checkbox i menyn som filtrerar matrisen så att endast uppgifter med obehandlade inlämningar visas.
    *   En indikerings-ikon (`bi-check-circle`) visas i summakolumnen endast när filtret är aktivt.
*   **Tydligare Summa-kolumn:**
    *   Bytt rubrikikon till `bi-bag-check` för att bättre symbolisera sammanställning/klartecken.
    *   Lagt till en tjockare vänsterkant och lätt grå bakgrund för att separera den från uppgifterna.
*   **Bättre Rubriker:**
    *   Uppgiftsrubriker tillåter nu **två rader text** innan de klipps av, vilket gör det lättare att läsa långa titlar.

---

## [2026-01-28] - "Säkerhet & Gränssnittspolering"

Andra halvan av dagen fokuserades på att göra applikationen säkrare för lärare och mer intuitiv att använda genom förbättrad visuell feedback.

### 🚀 Nytt & Tillagt
*   **Kryptering av Loggbok:**
    *   Implementerat full **AES-256-CBC-kryptering** för alla personliga anteckningar.
    *   Datan krypteras nu unikt per användare (nyckel härleds från en Master Key och Google ID).
    *   Stöd för transparent dekryptering vid läsning, med fallback för gamla okrypterade anteckningar.
*   **Export av Loggbok:**
    *   Lagt till en export-knapp i toppmenyn för Stream-vyn.
    *   Genererar en strukturerad **Markdown-fil (.md)** som inkluderar både Classroom-inlägg och privata anteckningar.
    *   Respekterar kalenderfilter för att möjliggöra export av specifika dagars planering.

### 💅 Design & UX
*   **Svenska Inforutor (Tooltips):**
    *   Lagt till förklarande texter på svenska på i stort sett alla interaktiva element (ikoner, knappar, statusar).
*   **Nya Status-ikoner i Matrisen:**
    *   Bytt ut otydliga symboler mot mer intuitiva:
        *   **Återlämnad:** Grön dubbelbock (`bi-check-all`).
        *   **Ej inlämnad:** Rödaktig cirkel med streck (`bi-dash-circle`).
*   **Visuell Feedback för Rättning:**
    *   Lagt till en gul varningsikon (<i class="bi bi-exclamation-circle-fill"></i>) i ämnes-summan om det finns nya inlämningar som väntar på bedömning.
*   **Enhetlig Design:**
    *   Gjort export-knapparna för Excel (Matrix) och Loggbok (Stream) identiska i stil och placering i headern.
*   **Lokalisering:**
    *   Översatt sökfältets placeholder till "Filtrera...".

### 🔧 Backend & Fixar
*   **Säkerhetsvarning:** Backenden varnar nu vid start om `MASTER_KEY` saknas i miljövyn.
*   **Buggfix:** Åtgärdat ett syntaxfel i Stream-vyn som orsakade byggfel efter kodomstrukturering.

---

## [2026-01-28] - "Stream, Loggbok & Persistence" (Del 1)

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