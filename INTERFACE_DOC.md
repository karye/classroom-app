# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver designen, interaktiviteten och logiken i "Classroom Matrix Dashboard". Applikationen är utformad för att ge lärare en snabb överblick över elevers prestationer genom en datatät matrisvy.

## 1. Gränssnittsöversikt (UI)

Applikationen har en **Hierarkisk Layout** som utgår från:
1.  **Toppmeny:** Dropdown för val av kurs, sökfält och verktyg ligger permanent i toppen (ljusgrå bakgrund).
2.  **Fullskärms-matris:** Resten av fönstret dedikeras till en stor tabell (Heatmap) med elever och uppgifter.

### Färgschema & Visuell Feedback
Färgkodning är nu mer sofistikerad och skiljer på *Prov* (Poängsatta) och *Uppgifter* (Ej poängsatta).

#### 1. Prov (Poängsatta uppgifter)
*   ⚪ **Vit:** Ingen inlämning / Eleven saknas i uppgiften.
*   🌱 **Mintgrön (`#f6ffed`):** Inlämnad (Väntar på rättning).
*   🔴 **Röd (`#ffccc7`):** 0-49% (Underkänt).
*   🟡 **Gul (`#d9f7be`):** 50-69% (Godkänt/E).
*   🟢 **Grön (`#95de64`):** 70-89% (Väl Godkänt/C).
*   🌟 **Mörkgrön (`#52c41a`):** 90-100% (Mycket Väl Godkänt/A).

#### 2. Uppgifter (Ej poängsatta)
*   ⚪ **Vit:** Saknas, Utkast eller Återtaget. (Ingen färg för att minska "rött brus").
*   🌱 **Mintgrön:** Inlämnad (`bi-check`).
*   🟢 **Grön:** Återlämnad/Klar (`bi-check-all`).

---

## 2. Funktionalitet & Komponenter

### A. Autentisering & Header
*   **Inloggning:** Via Google OAuth2.
*   **Logga ut:** Rensar sessionen och återställer vyer.
*   **Tidsstämpel:** Visar när datan senast hämtades från Google Classroom (bredvid uppdatera-knappen).

### B. Kurskortet (Nu integrerat i toppmenyn)
Val av kurs sker via en dropdown-lista.
*   **Länk:** "Öppna i Classroom" (extern länk) finns som knapp.
*   **Uppdatera-knapp:** Tvingar en ny hämtning av data från API:et.

### C. Matrisen (The Matrix)
Detta är kärnkomponenten som tar upp hela skärmen.

1.  **Rader (Y-axel):** Representerar individuella elever.
    *   Elever numreras (1, 2, 3...) för enkel referens.
    *   Rader är ultrakompakta för att visa maximalt antal elever.
    *   **Varning:** En röd triangel (⚠️) visas bredvid eleven om riskbedömningen slår till.
2.  **Kolumner (X-axel):**
    *   **Gruppering:** Uppgifter är grupperade efter sina "Topics" (Ämnesområden) i Classroom, sorterade alfabetiskt.
    *   **Rubriker:** Visar upp till två rader text för bättre läsbarhet.
    *   **Expandering:** Varje ämne kan fällas ut/in.
        *   **Ihopfälld:** Visar endast en kolumn: "Max" (Ikon: `bi-bag-check`).
        *   **Utfälld:** Visar alla individuella uppgifter inom ämnet + Max-kolumnen. Max-kolumnen har en tydlig gråmarkering och tjockare kant.
3.  **Filtrering:**
    *   **Text:** Sökfält tillåter filtrering av uppgiftsnamn i realtid.
    *   **Prov/Uppgifter:** Checkboxar för att visa/dölja poängsatta respektive ej poängsatta moment.
    *   **Att Rätta:** Visar endast uppgifter där det finns inlämningar som väntar på bedömning.

### D. Databearbetning (Logik)
Appen visar inte bara rådata utan gör beräkningar:
*   **Status-ikoner (Uppdaterade):**
    *   <i class="bi bi-check"></i> **Inlämnad:** Eleven har lämnat in (Mintgrön bakgrund).
    *   <i class="bi bi-check-all"></i> **Återlämnad (Klar):** Bedömd och klar (Grön bakgrund).
    *   **Utkast/Påbörjad:** Visas med mintgrön bakgrund utan ikon.
*   **Max-värde & Att Rätta:** 
    *   För varje ämnesgrupp beräknas den högsta procenten.
    *   **Att rätta-varning:** En liten cirkel (<i class="bi bi-check-circle"></i>) visas i summakolumnen *endast* när filtret "Att rätta" är aktivt.
*   **Riskhantering:** En elev flaggas som "Risk" (⚠️) om eleven har **minst ett ämne** där det bästa betyget (Max-kolumnen) är **under 50%**.
    *   *OBS:* Uppgifter som saknas (ej inlämnade/betygsatta) räknas **inte** som underkänt för varningen (de har vit bakgrund).

### E. Relativ Färgkodning (Inlämningar)
När matrisen visar uppgifter (ej betygssatta prov), ändras logiken för färgkodning i summakolumnen:
*   Färgen baseras på en **relativ skala** inom varje ämne.
*   Systemet letar upp det *högsta* antalet inlämningar någon elev har gjort i det ämnet.
*   En elevs färg beräknas som: `(Elevens inlämningar / Max inlämningar i klassen) * 100`.
    *   Detta gör att om läraren lagt ut 10 uppgifter men ingen gjort fler än 5, räknas 5 som "100%" (Grönt).

---

## 3. Stream & Loggbok (Nyhet)

En separat vy ("Stream") ger läraren möjlighet att följa flödet och planera lektioner.

### Funktioner
*   **Kompakt flöde:** Inlägg visas som expanderbara rader för bättre överblick.
*   **Kalender-navigering:**
    *   En månadskalender till vänster visar vilka dagar som har inlägg (markerade med prick).
    *   Klicka på ett datum för att filtrera flödet.
    *   Visar **veckonummer** för enkel planering.
*   **Privat Loggbok (Krypterad):**
    *   Varje inlägg har en dedikerad "Loggbok"-sektion (högerkolumn på desktop).
    *   Anteckningar sparas i en lokal SQLite-databas.
    *   **Säkerhet:** Alla anteckningar krypteras med **AES-256-CBC** och en unik nyckel per användare (härledd från en Master Key och ditt Google ID). Ingen annan kan läsa dina tankar.
    *   **Markdown-stöd:** Anteckningar kan formateras med fetstil, listor etc.

### Exportfunktioner
Appen har nu utökade exportmöjligheter via knappar i toppmenyn:
1.  **Exportera Excel (Matrix-vy):** Laddar ner en CSV-fil med hela betygstabellen.
2.  **Exportera Loggbok (Stream-vy):** Genererar en snygg Markdown-fil (`.md`) med alla inlägg och dina privata anteckningar för den valda kursen (eller vald dag). Perfekt för arkivering eller utskrift.

### Språk & Hjälp
*   **Svenska:** Hela gränssnittet (inklusive tooltips vid hovring) är nu på svenska.
*   **Tooltips:** Hovra över ikoner, rubriker eller knappar för att få en förklaring av vad de gör.

---

## 4. Todo (Att Göra) - Nyhet

En dedikerad vy för att hantera rättningsbördan ("Inbox Zero").

*   **Global Lista:** Hämtar inlämningar från *alla* dina aktiva kurser samtidigt.
*   **Design:** Extremt kompakt tabell (samma densitet som Matrix) för att visa maximalt antal rader.
*   **Kolumner:**
    1.  **Kurs:** Vilket klassrum uppgiften tillhör.
    2.  **Elev:** Namn på eleven.
    3.  **Uppgift:** Uppgiftens titel.
    4.  **Inlämnad:** Datum och tidpunkt för inlämningen (sorterad nyast överst).
    5.  **Länk:** En knapp för att öppna inlämningen direkt i Google Classroom för rättning.
*   **Filtrering:** Använd kursväljaren i toppen för att se "Alla klassrum" eller filtrera på ett specifikt.

---

## 5. Förslag till Förbättringar (Roadmap)

Här följer förslag på funktioner och UX-förbättringar för framtida versioner:

### Elevhälsa & Uppföljning
1.  **Elevkort & Trendanalys:** 📈 Klicka på namn för att se linjediagram över utveckling.
2.  **"Maila Varning":** 📧 En knapp för att automatiskt generera mail till elever med varningssymbol.
3.  **Uppgiftsanalys:** 📊 Histogram som visar hur klassen presterade på en specifik uppgift.

### UX & Konfiguration
4.  **Konfigurerbara Gränser:** ⚙️ Låt läraren ställa in betygsgränser (idag 50/70/90%) och risk-gräns (idag 50%).
5.  **Dark Mode:** 🌙 Skonsamt läge för kvällsarbete.
6.  **Tooltips:** Hovra över en betygscell för mer info.

### Prestanda
7.  **Cache-optimering:** Mer robust state-hantering (Redux/TanStack Query).
8.  **Paginering:** Virtualisering vid mycket stora datamängder.