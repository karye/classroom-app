# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver designen, interaktiviteten och logiken i "Classroom Matrix Dashboard". Applikationen är utformad för att ge lärare en snabb överblick och ett effektivt arbetsflöde genom en datatät matrisvy och en dedikerad rättningsmodul.

## 1. Gränssnittsöversikt (Layout)

Applikationen använder en **tvåradig toppmeny** för att separera systemnavigation från vyer-specifika verktyg:

1.  **Huvudrad (Header):**
    *   **Vy-väljare:** Tre ikoner (Matrix, Stream, Todo) för att växla mellan appens huvudmoduler. Appen kommer ihåg din senast valda vy.
    *   **Kursväljare:** Dropdown för att välja aktiv kurs.
    *   **Systemkontroller:** Knapp för att öppna aktuell kurs i Google Classroom, en manuell Uppdatera-knapp (visar senast hämtad tid vid hovring) och Logga ut.
2.  **Verktygsrad (Toolbar):** En kontextberoende rad som visar kontroller specifika för den vy du befinner dig i (t.ex. sökfält, filter och exportknappar).

---

## 2. Huvudmoduler

### A. Matrisen (The Matrix)
En fullskärmstabell (Heatmap) som visualiserar elevresultat.
*   **Rader:** Elever, numrerade och sorterbara. En varningssymbol (⚠️) visas om eleven har underkänt i något ämne.
*   **Kolumner:** Uppgifter grupperade efter Classroom-ämnen. Varje ämne kan expanderas för detaljer eller kollapsas till en "Max"-kolumn.
*   **Verktyg:** Sökfält, filter för Prov/Uppgifter/"Att rätta", och sortering på namn, betyg eller flit.
*   **Export:** Direktknapp till Excel (CSV).

### B. Stream & Loggbok
Ett flöde för planering och historik.
*   **Flöde:** Kursens meddelanden grupperade per månad med en förhandsvisning på 3 rader.
*   **Kalender:** En helt responsiv månadskalender för snabbnavigering. Blå prickar indikerar dagar med inlägg.
*   **Privat Loggbok:** Krypterade anteckningar med Markdown-stöd kopplade till varje inlägg. Sparas säkert i en SQLite-databas.
*   **Export:** Knapp för att generera en Markdown-fil (.md) av hela loggboken.

### C. Todo (Att Göra)
En optimerad vy för "Inbox Zero"-rättning.
*   **Vänstermeny:** Navigeringslista över alla uppgifter med väntande inlämningar, grupperade efter ämne. Stödjer navigering med piltangenter.
*   **Elevlista:** En ultrakompakt lista över elever som lämnat in den valda uppgiften. Visar inlämningstid och varningsflagga om inlämningen är sen.
*   **Statistik:** Visar i realtid hur många elever av totalantalet som har lämnat in.

---

## 3. Prestanda & Cachning

För att säkerställa en snabb användarupplevelse använder appen **Lokal Cachning (localStorage)**:
*   Datan i alla vyer sparas lokalt i webbläsaren.
*   När du öppnar appen laddas den cachade datan omedelbart.
*   Användaren har full kontroll över nätverkstrafiken och väljer själv när ny data ska hämtas från Google via den manuella uppdateringsknappen.

---

## 4. Säkerhet

*   **Autentisering:** Sker via Google OAuth2.
*   **Kryptering:** Alla privata loggboksanteckningar krypteras på servern med **AES-256-CBC** innan de sparas i databasen. Krypteringsnyckeln är unik per användare.
