# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver design och interaktion i "Classroom Matrix Dashboard".

## 1. Gränssnittsöversikt

Applikationen har en enhetlig layout med fokus på produktivitet och överblick.

### Navigering (Toppmeny)
*   **Vyer:** Knappar för att växla mellan **Schema**, **Matris**, **Stream**, **Todo** och **Inställningar**.
*   **Kursväljare:** Välj specifikt klassrum. Valet är **globalt** och bevaras när du växlar mellan alla vyer (utom Schema-vyn där den är inaktiv men valet sparas i bakgrunden).
*   **Status & Verktyg:** 
    *   **Uppdateringsknapp:** En intelligent knapp som synkar det som visas på skärmen (den aktuella kursen eller alla kurser om du är i en global vy).
    *   **Utloggning:** Längst till höger.

---

## 2. Gemensamma Gränssnittskomponenter

### A. Statusbar (Global Feedback)
All kommunikation om pågående processer och systemstatus bor i listen längst ner på skärmen.
*   **Laddningsstatus:** Visar t.ex. "Synkar med Google..." eller "Hämtar data...".
*   **Senast uppdaterad:** Visar tidsstämpel (t.ex. "Uppdaterad 14:30") till höger i listen när systemet är i vila.
*   **Auto-rensning:** Meddelanden försvinner automatiskt efter 5 sekunder.

### B. Enhetlig EmptyState
När data saknas visas en central ikon med knappen "Hämta nu".
*   **Statisk vy:** För att minimera distraktion är vyn helt statisk under laddning. All rörelse och status sker i Statusbaren.

---

## 3. Huvudmoduler

### A. Schema (Schedule View)
En vertikal veckokalender för planering med integrerad dashboard.
*   **Fokus:** Dagar som passerat (historik) tonas ut med 70% opacitet för att visuellt lyfta fram innevarande dag och framtiden.
*   **Interaktiva Kort:** Lektionskorten visar Gruppnamn och statusikoner.
    *   **Ikoner:** 
        *   📘 Bok (Blå): Inlägg/Material i flödet.
        *   📒 Bok (Gul): Privata loggboksanteckningar.
        *   📅 Kalender (Röd): Uppgifter med deadline detta datum.
    *   **Markering:** Den valda lektionen markeras tydligt och expanderar något.
*   **Lektionsdetaljer (Sidopanel):**
    *   **Sektioner:** Innehållet är uppdelat i tre kollapsbara sektioner:
        1.  **Att rätta:** Visar inlämningar som väntar på bedömning (Inbix Zero).
        2.  **Anteckningar:** Visar Classroom-inlägg (med klickbara material-piller för dokument/länkar) och privata anteckningar.
        3.  **Uppgifter (deadline idag):** Listar alla uppgifter som ska vara inlämnade detta datum, med direktlänk till Classroom.

### B. Matrisen (Matrix View)
En heatmap över elevresultat. 
*   **Smart summering:** För grupper utan betyg (t.ex. övningar) visas antal klara uppgifter istället för ett siffervärde.
*   **Heatmap:** Färgkodas baserat på resultat (Prov) eller status (Uppgifter).

### C. Stream & Loggbok (Stream View)
Ett sökbart flöde för historik och planering.
*   **Schemalagda inlägg:** Inlägg som ännu inte publicerats för elever syns här med en gul badge ("Schemalagd").
*   **Privat loggbok:** Skriv krypterade anteckningar kopplade till varje inlägg.

### D. Todo (Att Göra)
Din globala inkorg för rättning. Visar data från alla synliga kurser i en sorterbar lista.

### E. Inställningar (Settings View)
Hantera kurser, filter och systemdata.
*   **Systemdata:** Överblick över lagringsanvändning med rubriken "Status per kurs". Tabellen visar "Senast synkad", "Data (cache)" och "Loggbok (server)".

---

## 4. Designsystem

### Språk & Textregler
Applikationen följer svenska skrivregler för en professionell och enhetlig ton:
*   **Meningsversal:** Endast första ordet i en mening eller rubrik börjar med versal.
*   **Inga All-Caps:** Rubriker och etiketter skrivs i normal text, aldrig med bara stora bokstäver.

### Felhantering & Offline
Appen är byggd med "Offline-First"-tänk. Vid start laddas all sparad data in centralt så att användaren kan börja arbeta omedelbart utan att vänta på nätverksanrop.
