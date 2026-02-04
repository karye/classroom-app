# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver design och interaktion i "Classroom Matrix Dashboard".

## 1. Gränssnittsöversikt

Applikationen har en enhetlig layout med fokus på produktivitet och överblick.

### Navigering (Toppmeny)
*   **Vyer:** Knappar för att växla mellan **Schema**, **Matris**, **Stream**, **Todo** och **Inställningar**.
*   **Kursväljare:** Välj specifikt klassrum. (Inaktiverad i Schema-vyn då den visar allt).
*   **Status & Verktyg:** 
    *   **Uppdateringsknapp:** Snurrar och visar "Synkar..." när data hämtas. I Schema-vyn kräver den bekräftelse för att starta en global synk.
    *   **Utloggning:** Längst till höger.

### Enhetliga Verktygsrader
Matris- och Todo-vyn har nu identiska verktygsrader för konsekvent filtrering:
*   **Sök:** Fritextsökning på uppgiftstitlar.
*   **Visningsläge (Dropdown):**
    *   **Alla uppgifter:** Visar allt.
    *   **Prov & Bedömning:** Visar endast poängsatta uppgifter (med Heatmap i matrisen).
    *   **Uppgifter (Ej prov):** Visar endast opoängsatta uppgifter (bockar/status).
*   **Vy-specifika filter:** T.ex. "Deadline" (Matris) eller "Dölj tomma" (Todo).

---

## 2. Huvudmoduler

### A. Schema (Schedule View)
En vertikal veckokalender för planering med integrerad dashboard.
*   **Kalender:** Visar lektioner 08:00 - 18:00 (Mån-Fre) med smart krockhantering.
*   **Interaktivitet:** Klicka på en lektion för att filtrera dashboarden på just den kursen.
*   **Dashboard (Sidopanel):**
    *   **Att Rätta:** Visar inlämningar som kräver åtgärd.
    *   **Lägen:** Visar antingen "Topp 5" globalt (standard) eller alla för en vald kurs (vid klick i kalendern).

### B. Matrisen (Matrix View)
En heatmap över elevresultat.
*   **Filtrering:** Använd dropdown-menyn för att växla mellan prestationsöversikt (Prov) och aktivitetsöversikt (Uppgifter).
*   **Färgkodning:**
    *   **Ljusblå bakgrund:** Inlämnad uppgift (Action krävs).
    *   **Grön/Gul/Röd (Siffror):** Betygsatta prov (Heatmap baserat på %).
*   **Elevöversikt:** Klicka på en elev för att se en detaljerad lista med status-piller ("Badges").

### C. Stream & Loggbok (Stream View)
Ett sökbart flöde för historik.
*   **Sök:** Filtrera inlägg direkt på textinnehåll via verktygsraden.
*   **Kalender:** Filtrera på datum via sidomenyn.
*   **Loggbok:** Skriv privata anteckningar till varje inlägg.

### D. Todo (Att Göra)
Din inkorg för rättning.
*   **Sök:** Hitta specifika uppgifter snabbt.
*   **Filter:** 
    *   **Dölj tomma:** Fokusera på det som är aktuellt att rätta.
    *   **Dropdown:** Välj om du vill se Prov eller vanliga Uppgifter.
*   **Status:** Tydliga piller visar om en elev är "Inlämnad", "Klar" eller "Sen".

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