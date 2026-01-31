# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver design och interaktion i "Classroom Matrix Dashboard".

## 1. Gränssnittsöversikt

Applikationen har en enhetlig layout med fokus på produktivitet och överblick.

### Navigering (Toppmeny)
*   **Schema (Global):** En kalender-ikon längst till vänster. Visar ett sammanslaget veckoschema för alla kurser.
*   **Vyer:** Knappar för att växla mellan **Matris**, **Stream** och **Todo**.
*   **Kursväljare:** Välj specifikt klassrum. (Inaktiverad i Schema-vyn då den visar allt).
*   **Status & Verktyg:** Uppdateringsknapp, Inställningar och Utloggning till höger.

### Enhetliga Verktygsrader
Varje vy har en konsekvent verktygsrad ("Toolbar") under menyn:
*   **Vänster:** Sökfält ("Filtrera...") och vy-specifika filter (t.ex. "Dölj tomma", "Visa Heatmap").
*   **Höger:** Export-knappar (Excel, Loggbok).

---

## 2. Huvudmoduler

### A. Schema (Schedule View) **[NY]**
En vertikal veckokalender för planering.
*   **Tidsaxel:** 08:00 - 18:00 (Måndag - Fredag).
*   **Globalt:** Hämtar lektioner från alla dina aktiva kurser.
*   **Kort:** Varje lektion visas som ett färgkodat kort med Titel, Grupp och Sal.
*   **Smart Layout:** Lektioner som krockar visas sida-vid-sida istället för att överlappa.

### B. Matrisen (Matrix View)
En heatmap över elevresultat.
*   **Kompakt Design:** Använder ikoner i rutnätet för att spara plats.
*   **Färgkodning:**
    *   **Ljusblå bakgrund:** Inlämnad uppgift (Action krävs).
    *   **Grön/Gul/Röd (Siffror):** Betygsatta prov (Heatmap baserat på %).
*   **Elevöversikt:** Klicka på en elev för att se en detaljerad lista med status-piller ("Badges").

### C. Stream & Loggbok (Stream View)
Ett sökbart flöde för historik.
*   **Sök:** Filtrera inlägg direkt på textinnehåll via verktygsraden.
*   **Kalender:** Filtrera på datum via sidomenyn.
*   **Loggbok:** Skriv privata anteckningar till varje inlägg.
*   **Offline-stöd:** Visar cachad data om nätverket ligger nere.

### D. Todo (Att Göra)
Din inkorg för rättning.
*   **Sök:** Hitta specifika uppgifter snabbt.
*   **Filter:** "Dölj utan inlämningar" låter dig fokusera på det som är aktuellt.
*   **Status:** Tydliga piller visar om en elev är "Inlämnad", "Klar" eller "Sen".

---

## 3. Designsystem

### Status-piller (StatusBadge)
En gemensam komponent används överallt för att visa status:
*   🟢 **Inlämnad:** Grön bakgrund/text + bock.
*   🔵 **Klar:** Blå bakgrund/text + dubbelbock.
*   ⚪ **Ej inlämnad:** Grå bakgrund/text + streck.
*   🔴 **Sen:** Röd tilläggs-badge.

### Felhantering & Offline
Appen är byggd med "Offline-First"-tänk:
*   **Cache:** All data sparas lokalt (IndexedDB).
*   **Robusthet:** Om en uppdatering misslyckas (404/Nätverk) behålls den gamla datan på skärmen istället för att visa ett felmeddelande.
