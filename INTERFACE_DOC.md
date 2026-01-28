# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver designen, interaktiviteten och logiken i "Classroom Matrix Dashboard". Applikationen är utformad för att ge lärare en snabb överblick över elevers prestationer genom en datatät matrisvy.

## 1. Gränssnittsöversikt (UI)

Applikationen har en **Hierarkisk Layout** som utgår från:
1.  **Toppmeny:** Dropdown för val av kurs, sökfält och verktyg ligger permanent i toppen (ljusgrå bakgrund).
2.  **Fullskärms-matris:** Resten av fönstret dedikeras till en stor tabell (Heatmap) med elever och uppgifter.

### Färgschema & Visuell Feedback
Färgkodning baseras på **procent** av maxpoängen för varje uppgift:

*   🔴 **0-49%:** Ej godkänt (`#ffccc7`)
*   🟡 **50-69%:** Godkänt (`#d9f7be`)
*   🟢 **70-89%:** Bra (`#95de64`)
*   🌟 **90-100%:** Utmärkt (`#52c41a` med vit text)

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
    *   **Expandering:** Varje ämne kan fällas ut/in.
        *   **Ihopfälld:** Visar endast en kolumn: "Max". Detta visar elevens *bästa procentuella resultat* inom det ämnet.
        *   **Utfälld:** Visar alla individuella uppgifter inom ämnet (smala 50px kolumner) + Max-kolumnen. Kolumnerna får grå bakgrund för tydlighet.
3.  **Filtrering:**
    *   Ett sökfält tillåter filtrering av uppgiftsnamn i realtid.

### D. Databearbetning (Logik)
Appen visar inte bara rådata utan gör beräkningar:
*   **Status-ikoner:**
    *   <i class="bi bi-check-circle-fill"></i> Inlämnad
    *   <i class="bi bi-arrow-return-left"></i> Återlämnad
    *   <i class="bi bi-pencil-fill"></i> Påbörjad (Created)
    *   <i class="bi bi-square"></i> Ej inlämnad/Ej bedömd
*   **Max-värde:** För varje ämnesgrupp beräknas den högsta procenten en elev uppnått.
*   **Riskhantering:** En elev flaggas som "Risk" (⚠️) om eleven har **minst ett ämne** där det bästa betyget (Max-kolumnen) är **under 50%**.
    *   *OBS:* Uppgifter som saknas (ej inlämnade/betygsatta) räknas **inte** som underkänt för varningen. Varningen gäller endast konstaterade misslyckanden.
*   **Sortering:**
    *   **Namn:** A-Ö eller Ö-A.
    *   **Prestation (Varning):** Sorterar efter lägst genomsnittsbetyg.
    *   **Prestation (Bäst):** Sorterar efter högst genomsnittsbetyg.
    *   **Mest inlämnat:** Sorterar efter flest antal inlämnade/klara uppgifter (baserat på aktuellt filter).

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
*   **Privat Loggbok (SQLite):**
    *   Varje inlägg har en dedikerad "Loggbok"-sektion (högerkolumn på desktop).
    *   Anteckningar är **privata** (kopplade till ditt Google ID) och sparas i en databas på servern.
    *   **Markdown-stöd:** Anteckningar kan formateras med fetstil, listor etc.

---

## 4. Förslag till Förbättringar (Roadmap)

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