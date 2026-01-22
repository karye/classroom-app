# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver designen, interaktiviteten och logiken i "Classroom Matrix Dashboard". Applikationen är utformad för att ge lärare en snabb överblick över elevers prestationer genom en datatät matrisvy.

## 1. Gränssnittsöversikt (UI)

Applikationen har en **Hierarkisk Layout** som utgår från:
1.  **Dashboard-vy:** Lista över alla aktiva kurser.
2.  **Kurs-vy (Expanderad):** Kontrollpanel och filter.
3.  **Matris-vy (Heatmap):** Detaljerad tabell med elever och uppgifter.

### Färgschema & Visuell Feedback
För att snabbt signalera status används färgkodning på cellnivå baserat på poäng (0-20):

*   🟥 **Ljusröd (#ffccc7):** Underkänt / Varning (< 10 poäng).
*   🟩 **Ljusgrön (#d9f7be):** Godkänt (10-13 poäng).
*   🌿 **Mellangrön (#95de64):** Väl godkänt (14-15 poäng).
*   🌲 **Mörkgrön (#52c41a):** Utmärkt (16+ poäng).
*   ⬜ **Vit/Grå:** Ej bedömd eller ej inlämnad.

---

## 2. Funktionalitet & Komponenter

### A. Autentisering & Header
*   **Inloggning:** Via Google OAuth2.
*   **Statusindikator:** Visar om användaren är inloggad.
*   **Logga ut:** Rensar sessionen och återställer vyer.

### B. Kurskortet
Varje kurs presenteras som ett "kort" med följande kontroller:
*   **Länk:** "Öppna i Classroom" (extern länk).
*   **Uppdatera-knapp:** Tvingar en ny hämtning av data från API:et (användbart om man nyss rättat något i Classroom).
*   **Visa/Dölj Matris:** Laddar in tung data (elever/inlämningar) först när användaren begär det ("Lazy loading") för att spara bandbredd och API-kvoter.

### C. Matrisen (The Matrix)
Detta är kärnkomponenten.

1.  **Rader (Y-axel):** Representerar individuella elever.
2.  **Kolumner (X-axel):**
    *   **Gruppering:** Uppgifter är grupperade efter sina "Topics" (Ämnesområden) i Classroom.
    *   **Expandering:** Varje ämne har en header (t.ex. "[+] Geografi").
        *   **Ihopfälld:** Visar endast en kolumn: "Max". Detta visar elevens *bästa* resultat inom det ämnet.
        *   **Utfälld:** Visar alla individuella uppgifter inom ämnet + Max-kolumnen.
3.  **Filtrering:**
    *   Ett sökfält tillåter filtrering av uppgiftsnamn i realtid. Exempel: Skriv "Prov" för att dölja alla inlämningsuppgifter och bara se prov.

### D. Databearbetning (Logik)
Appen visar inte bara rådata utan gör beräkningar:
*   **Status-översättning:** Om inget betyg finns, visas textstatus (t.ex. "Inlämnad", "Återlämnad").
*   **Max-värde:** För varje ämnesgrupp loopar appen igenom alla ingående uppgifter och extraherar det högsta betyget. Detta hjälper läraren att se "Har eleven klarat *någon* uppgift inom detta moment?".

---

## 3. Förslag till Förbättringar (Roadmap)

Här följer förslag på funktioner och UX-förbättringar för framtida versioner:

### UX & Användarvänlighet
1.  **Låsta Rubriker (Sticky Headers):**
    *   *Problem:* I långa listor försvinner rubrikerna när man scrollar.
    *   *Lösning:* Lås både ämnesraden och elevnamn-kolumnen så de alltid är synliga när man scrollar (Excel-frysning).
2.  **Tooltips:**
    *   *Förslag:* Hovra över en betygscell för att se uppgiftens fullständiga namn, datum för inlämning och eventuella privata kommentarer från läraren.
3.  **Sortering:**
    *   *Förslag:* Möjlighet att sortera elever på namn (A-Ö) eller på prestation (t.ex. de med flest röda markeringar överst för att snabbt identifiera stödbehov).

### Funktionalitet
4.  **CSV/Excel-export:**
    *   En knapp för att ladda ner hela matrisen som en .csv-fil för dokumentation eller vidare analys i Excel.
5.  **Genomsnitt & Median:**
    *   Lägg till en rad längst ner i matrisen som visar klassens snittbetyg på varje uppgift.
6.  **"Klicka för att öppna":**
    *   Gör varje cell klickbar. Ett klick tar läraren direkt till rättningsvyn för den specifika eleven och uppgiften i Google Classroom.

### Prestanda
7.  **Cache-optimering:**
    *   Just nu hämtas data varje gång man fäller ut en kurs (om man inte tvingar uppdatering). Implementera `localStorage` eller en mer robust "state management" (typ Redux/TanStack Query) för att minska laddtiderna när man navigerar fram och tillbaka.
8.  **Paginering:**
    *   Om en kurs har 100+ uppgifter kan renderingen bli långsam. Virtualisering (t.ex. `react-window`) kan behövas för att rendera endast de celler som syns på skärmen.
