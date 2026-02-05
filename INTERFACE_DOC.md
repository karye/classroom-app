# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver design och interaktion i "Classroom Matrix Dashboard".

## 1. Gränssnittsöversikt

Applikationen har en enhetlig layout med fokus på produktivitet och överblick.

### Navigering (Toppmeny)
*   **Vyer:** Knappar för att växla mellan **Schema**, **Matris**, **Stream**, **Todo** och **Inställningar**.
*   **Kursväljare:** Välj specifikt klassrum. Valet är nu **globalt** och bevaras när du växlar mellan alla vyer (utom Schema-vyn där den är inaktiv men valet sparas i bakgrunden).
*   **Status & Verktyg:** 
    *   **Uppdateringsknapp:** Startar en global synk (i Schema-vyn) eller en djup-synk av vald kurs. All visuell respons visas nu i **Statusbaren** längst ner.
    *   **Utloggning:** Längst till höger.

---

## 2. Gemensamma Gränssnittskomponenter

### A. Statusbar (Global Feedback)
All kommunikation om pågående processer har flyttats till en diskret svart list längst ner på skärmen.
*   **Laddningsstatus:** Visar t.ex. "Synkar med Google..." eller "Hämtar data...".
*   **Resultat:** Visar sammanfattningar som "Synkade 25 elever och 10 uppgifter".
*   **Auto-rensning:** Meddelanden försvinner automatiskt efter 5 sekunder.

### B. Enhetlig EmptyState
När data saknas (t.ex. efter nollställning) visas en central ikon med knappen "Hämta nu".
*   **Statisk vy:** För att minimera distraktion är vyn helt statisk under laddning. All rörelse och status sker i Statusbaren.
*   **Knapp-hantering:** Knappen försvinner omedelbart vid klick för att förhindra dubbel-synkning.

---

## 3. Huvudmoduler

### A. Schema (Schedule View)
En vertikal veckokalender för planering med integrerad dashboard.
*   **Kalender:** Visar lektioner 08:00 - 18:00 (Mån-Fre) med smart krockhantering.
*   **Snabb-synk:** Synk-knappen i denna vy uppdaterar endast kalenderhändelser för maximal hastighet. Bekräftelsemodalen listar exakt vilka klassrum som omfattas.
*   **Hierarkisk Dashboard (Sidopanel):**
    *   **Struktur:** Grupperar inlämningar i en tydlig hierarki: **Klassrum ➔ Ämne ➔ Uppgift**.
    *   **Kollapsbarhet:** Varje klassrumsblock kan expanderas eller kollapsas för att spara utrymme.
    *   **Elev-chips:** Visar elever med "Förnamn + Initial" (t.ex. Karim S) i kompakta pill-formade brickor. Röda brickor markerar sena inlämningar.
    *   **Global vy:** Om ingen lektion är vald visas *alla* väntande inlämningar från alla synliga kurser.

### B. Matrisen (Matrix View)
En heatmap över elevresultat. Nu helt synkroniserad med Stream-vyn via den gemensamma cachen.

### C. Stream & Loggbok (Stream View)
Ett sökbart flöde för historik. Nu integrerat i den stora "detalj-synken" så att inlägg laddas in samtidigt som betyg och uppgifter.

### D. Todo (Att Göra)
Din inkorg för rättning.
*   **Omedelbarhet:** Visar data direkt från den centrala källan så snart synkningen är klar, utan fördröjning.
*   **Filter:** Respekterar globala filter för dolda kurser och ämnen.

### E. Inställningar (Settings View)
En dedikerad vy för konfiguration.
*   **Flik: Anpassning:**
    *   Hantera vilka kurser som ska visas (Dölj gamla).
    *   Sätt globala filter för att dölja specifika uppgifter eller ämnen.
*   **Flik: Systemdata:**
    *   Överblick över lagringsanvändning (Cache & Databas).
    *   Statistiktabell per kurs.
    *   Knappar för att rensa cache vid problem.
*   **Flik: Elevregister:**
    *   **Importera:** Klistra in textlistor (SchoolSoft). Stödjer både 2- och 3-kolumnsformat med strikt validering.
    *   **Koppla:** Dropdown för att länka en importerad grupp till en specifik Google-kurs.
    *   **Matcha:** Knapp för att översätta namn till riktiga Google ID:n.
    *   **Ikoner:** ✅ Grön bock (Matchad), ⚠️ Gul triangel (Ej matchad/Temp).

---

## 4. Designsystem

### Elevlistor
En konsekvent design används i alla vyer (Matris, Todo, Inställningar) för att visa elever:
*   **Namn:** Fet stil.
*   **Klass:** Inom parentes, mindre och grå text (t.ex. `(TE23b)`).
*   **Avatar:** Cirkel med första bokstav eller bild.

### Status-piller (StatusBadge)
En gemensam komponent används överallt för att visa status:
*   🟢 **Inlämnad:** Grön bakgrund/text + bock.

### Felhantering & Offline
Appen är byggd med "Offline-First"-tänk:
*   **Cache:** All data sparas lokalt (IndexedDB).
*   **Robusthet:** Om en uppdatering misslyckas (404/Nätverk) behålls den gamla datan på skärmen istället för att visa ett felmeddelande.