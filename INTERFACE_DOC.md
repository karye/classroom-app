# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver designen, interaktiviteten och logiken i "Classroom Matrix Dashboard". Applikationen är utformad för att ge lärare en snabb överblick och ett effektivt arbetsflöde genom en datatät matrisvy och en dedikerad rättningsmodul.

## 1. Gränssnittsöversikt (Layout)

Applikationen använder en **tvåradig toppmeny** för att separera systemnavigation från vyer-specifika verktyg:

1.  **Huvudrad (Header):**
    *   **Vy-väljare:** Tre ikoner (Matrix, Stream, Todo) för att växla mellan appens huvudmoduler. Appen kommer ihåg din senast valda vy.
    *   **Kursväljare:** Dropdown för att välja aktiv kurs. Vid uppstart laddas senast valda kurs automatiskt.
    *   **Systemkontroller:** Knappar för att öppna kursen i Classroom, en manuell **Uppdatera**-knapp (med animerad rotationsikon), **Inställningar** (kugghjul) och **Logga ut**.
2.  **Verktygsrad (Toolbar):** En kontextberoende rad som visar kontroller specifika för den vy du befinner dig i (t.ex. sökfält, filter och exportknappar).

---

## 2. Huvudmoduler

### A. Matrisen (The Matrix)
En fullskärmstabell (Heatmap) som visualiserar elevresultat.
*   **Rader:** Elever, numrerade och sorterbara. Visar nu även **profilbilder** och fetstilta namn för bättre igenkänning.
*   **Kolumner:** Uppgifter grupperade efter Classroom-ämnen. Varje ämne har en fix bredd (90px) och titlar på upp till 4 rader med ellipsis.
*   **Elevsammanställning:** Klicka på en elev för att öppna en **detaljerad översikt** över alla resultat, optimerad för utskrift med tydliga ikoner.
*   **Verktyg:** Sökfält, filter för Prov/Uppgifter/"Att rätta", och sortering på namn, betyg eller flit.
*   **Export:** Direktknapp till Excel (CSV).

### B. Stream & Loggbok
Ett flöde för planering och historik.
*   **Flöde:** Kursens meddelanden grupperade per månad.
*   **Kalender:** En månadskalender för snabbnavigering. Blå prickar indikerar dagar med inlägg.
*   **Privat Loggbok:** Krypterade anteckningar med Markdown-stöd kopplade till varje inlägg.
*   **Export:** Knapp i verktygsraden för att generera en Markdown-fil (.md) av hela loggboken.

### C. Todo (Att Göra)
En optimerad vy för "Inbox Zero"-rättning.
*   **Vänstermeny:** Navigeringslista över uppgifter med väntande inlämningar. Visar endast uppgifter som inte döljs av globala filter.
*   **Elevlista:** Uppdelad i tre tydliga kategorier: **Att rätta**, **Klara** och **Ej inlämnade**.
*   **Statistik:** Visar i realtid hur många elever som väntar på rättning av det totala antalet i klassen.

---

## 3. Globala Inställningar
Genom kugghjulet i sidhuvudet kan användaren definiera filter för att städa upp i vyerna:
*   **Dölj uppgifter:** Exkludera inlägg vars titel innehåller specifika ord (t.ex. "Lunch").
*   **Dölj ämnen:** Exkludera hela ämnesblock från både matrisen och todo-listan.
*   **Beständighet:** Dessa inställningar sparas i serverns databas och följer med användaren oavsett enhet.

---

## 4. Prestanda & Cachning

Appen använder **IndexedDB** för lokal cachning av tung data:
*   Inga begränsningar i datamängd (till skillnad från localStorage).
*   Data laddas asynkront vilket ger ett mjukare gränssnitt.
*   Den roterande pilen i mitten av skärmen indikerar när bakgrundssynkronisering pågår.

---

## 4. Säkerhet

*   **Autentisering:** Sker via Google OAuth2.
*   **Kryptering:** Alla privata loggboksanteckningar krypteras på servern med **AES-256-CBC** innan de sparas i databasen. Krypteringsnyckeln är unik per användare.
