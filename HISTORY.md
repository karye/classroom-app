# Projekt Historik - 2026-01-22

Denna fil loggar betydande ändringar och förbättringar som genomförts under utvecklingssessionen.

## 🔧 Backend & Infrastruktur

### Autentisering & Nätverk
*   **Dynamisk Redirect URI:** Ändrade `backend/server.js` för att dynamiskt räkna ut `redirect_uri` baserat på inkommande `Host`-headers. Detta löste problemet med inloggning från andra enheter via nätverket (t.ex. via `.nip.io`-adresser).
*   **Nginx Proxy:** Uppdaterade `frontend/nginx.conf` för att korrekt vidarebefordra `Host`, `X-Forwarded-Host` och `X-Forwarded-Proto` till backend, vilket är kritiskt för att Google OAuth ska fungera bakom en proxy.
*   **Miljövariabler:** Uppdaterade hanteringen av `.env` för att inte låsa `REDIRECT_URI` till localhost.

### Loggning
*   **Persistent Loggning:** Implementerade filbaserad loggning i `backend/server.js`.
    *   Loggar sparas nu till disk i mappen `logs/backend/server.log`.
    *   Nginx-loggar sparas till `logs/frontend/`.
*   **Docker Volumes:** Lade till volym-mappningar i `docker-compose.yml` för att spara loggar utanför containrarna.

## 🎨 Frontend & UI/UX

### Ramverk & Design
*   **Bootstrap 5:** Migrerade hela stilsättningen till Bootstrap 5.
    *   Lade till `bootstrap` och `bootstrap-icons` som dependencies.
    *   Ersatte CSS-hack med standard Bootstrap-klasser för knappar, formulär och layout.
*   **Färgschema:** Uppdaterade färgkodningen för betyg till en "gladare" och tydligare palett:
    *   Godkänt: Ljusgrön
    *   Bra: Gräsgrön
    *   Utmärkt: Mörkgrön (Vit text)

### Layout & Struktur
*   **Fullskärms-vy:** Designade om huvudvyn från en lista med kort till en **fullskärmsapplikation**.
    *   **Toppmeny:** Dropdown för val av kurs, sökfält och verktyg ligger nu permanent i toppen.
    *   **Maximal Matris:** Tabellen tar upp allt resterande utrymme (`vh-100`) med egna scrollbars.
*   **Sticky Headers:** Implementerade låsta rubriker (både för ämnen/uppgifter i toppen och elever till vänster) så att man aldrig tappar orienteringen vid scrollning.
*   **Kompakt Design:** Trimmade padding och fontstorlekar för att visa maximalt med data på skärmen.

### Funktionalitet
*   **Interaktivitet:**
    *   **Radmarkering:** Klicka på en elev för att markera hela raden (hjälper ögat att följa raden).
    *   **Tangentbordsstyrning:** Använd Pil Upp/Ned för att flytta markeringen mellan elever.
    *   **Länkar:** Klicka på betyg eller uppgifter för att öppna dem direkt i Google Classroom.
*   **Sortering & Filtrering:**
    *   Filtrera uppgifter via fritextsökning.
    *   Sortera elever på Namn (A-Ö) eller Prestation (Varningar först / Bäst först).
*   **Export:** Lade till funktion för att exportera aktuell vy till en **CSV-fil** (Excel).
*   **Numrering:** Lade till löpnummer (1, 2, 3...) framför elevnamn.

## 📚 Dokumentation
*   **README.md:** Uppdaterad med kompletta instruktioner för installation, Google Cloud-setup och felsökning.
*   **INTERFACE_DOC.md:** Skapad ny fil som beskriver gränssnittets logik och framtida förbättringsförslag.
