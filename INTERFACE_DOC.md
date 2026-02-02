# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver design och interaktion i "Classroom Matrix Dashboard".

## 1. Gränssnittsöversikt

Applikationen har en enhetlig layout med fokus på produktivitet och överblick.

### Navigering (Toppmeny)
*   **Schema (Global):** En kalender-ikon längst till vänster. Visar ett sammanslaget veckoschema för alla kurser.
*   **Vyer:** Knappar för att växla mellan **Matris**, **Stream** och **Todo**. Appen minns ditt senast valda klassrum unikt för varje vy.
*   **Kursväljare:** Välj specifikt klassrum. (Inaktiverad i Schema-vyn då den visar allt).
*   **Status & Verktyg:** 
    *   **Uppdateringsknapp:** Snurrar och visar "Synkar..." när data hämtas.
    *   **Inställningar:** Hantera globala filter och kursurval.
    *   **Utloggning:** Längst till höger.

### Enhetliga Verktygsrader
Varje vy har en konsekvent verktygsrad ("Toolbar") under menyn:
*   **Vänster:** Sökfält ("Filtrera...") och vy-specifika filter (t.ex. "Deadline", "Visa Heatmap").
*   **Höger:** Export-knappar (Excel, Loggbok).

---

## 2. Huvudmoduler

### A. Schema (Schedule View) **[UPPDATERAD]**
En vertikal veckokalender för planering med integrerad dashboard.
*   **Kalender:** Visar lektioner 08:00 - 18:00 (Mån-Fre) med smart krockhantering.
*   **Dashboard (Sidopanel):**
    *   **Att Rätta (Topp 5):** En lista till höger som visar de 5 senaste inlämningarna som kräver åtgärd.
    *   Ger en snabb överblick över "brinnande" uppgifter direkt i planeringsvyn.

### B. Matrisen (Matrix View)
En heatmap över elevresultat.
*   **Kompakt Design:** Använder ikoner i rutnätet för att spara plats.
*   **Nya Filter:**
    *   **Deadline:** En checkbox som döljer alla uppgifter som saknar slutdatum (för att fokusera på "riktiga" uppgifter).
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
*   **Filter:** 
    *   **Dölj utan inlämningar:** Fokusera på det som är aktuellt att rätta.
    *   **Dölj utan poäng:** Filtrera bort enkla uppgifter (t.ex. närvaro/enkäter) som inte har poäng.
*   **Status:** Tydliga piller visar om en elev är "Inlämnad", "Klar" eller "Sen".
*   **Felsökning:** Klicka på en uppgift för att se en detaljerad logg i webbläsarens konsol (F12) med status och poäng för varje elev.

---

## 3. Inställningar & Anpassning

Via kugghjulsikonen i toppmenyn når du globala inställningar som påverkar hela appen.

### Kursurval ("Dina klassrum")
*   **Filtrera Kurser:** En lista med checkboxar låter dig välja exakt vilka klassrum som ska synas.
*   **Dölj gamla:** Avmarkera kurser du inte längre undervisar i för att rensa upp i menyer och listor.
*   **Global Effekt:** Detta filter påverkar kursväljaren, matrisvyn, todos och dashboarden.

### Innehållsfilter
*   **Dölj uppgifter:** Filtrera bort specifika uppgifter baserat på nyckelord i titeln (t.ex. "Lunch").
*   **Dölj ämnen:** Filtrera bort hela ämnesområden (Topics) för att minska brus.

---

## 4. Designsystem

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