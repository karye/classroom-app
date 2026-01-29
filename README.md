# Google Classroom Matrix Dashboard

En fullstack webbapplikation för lärare att visualisera och följa elevers framsteg i Google Classroom. Appen presenterar data i en överskådlig matris (Heatmap) där rader representerar elever och kolumner representerar uppgifter, grupperade efter ämnen (Topics).

## 🚀 Huvudfunktioner

*   **Matrisvy:** Samlad vy av alla elevers resultat i en kurs.
*   **Ämnesgruppering:** Uppgifter grupperas automatiskt under sina Classroom-ämnen.
*   **Max-betyg:** Beräknar automatiskt högsta uppnådda betyg (procentuellt) inom ett ämne/grupp.
*   **Färgkodning & Status:**
    *   ⚪ **Vit:** Saknas / Utkast (Minskar stress och rött brus).
    *   🌱 **Mintgrön:** Inlämnad (Väntar på rättning) eller Pågående.
    *   🔴 **0-49%:** Ej godkänt
    *   🟡 **50-69%:** Godkänt (E)
    *   🟢 **70-89%:** Väl Godkänt (C)
    *   🌟 **90-100%:** Mycket Väl Godkänt (A)
*   **Stream & Loggbok:**
    *   Läs flödet (Announcements) från Classroom i en kompakt vy.
    *   **Privat Loggbok:** Skriv och spara personliga lektionsanteckningar (Markdown-stöd) kopplade till varje inlägg. Anteckningar sparas säkert per användare.
    *   **Kalender:** Filtrera inlägg per datum och se veckonummer.
*   **Live Data:** Hämtar data direkt från Google Classroom API.
*   **Sökfilter & Sortering:** 
    *   Filtrera på "Att rätta" för att snabbt hitta obehandlade inlämningar.
    *   Sortera elever på prestation eller inlämningsflit.

## 🛠 Teknikstack

Projektet är containeriserat med Docker för enkel driftsättning.

*   **Frontend:** React (Vite), Bootstrap 5, Bootstrap Icons, Recharts, React-Markdown.
*   **Backend:** Node.js, Express, Google APIs, **SQLite** (för persistent lagring av loggbok).
*   **Infrastruktur:** Docker & Docker Compose.
*   **Loggning:** Filbaserad loggning för både access- och applikationsloggar.

## ⚙️ Förberedelser (Google Cloud)

För att appen ska fungera krävs ett projekt i Google Cloud Platform (GCP).

1.  Skapa ett projekt på [Google Cloud Console](https://console.cloud.google.com/).
2.  Aktivera **Google Classroom API**.
3.  Gå till **APIs & Services > Credentials** och skapa ett **OAuth 2.0 Client ID**.
4.  Konfigurera **Authorized JavaScript origins**:
    *   `http://localhost:8080` (för lokal körning)
    *   `http://DIN-IP-ADRESS.nip.io:8080` (för nätverksåtkomst, t.ex. `http://10.151.168.5.nip.io:8080`)
5.  Konfigurera **Authorized redirect URIs**:
    *   `http://localhost:8080/auth/google/callback`
    *   `http://DIN-IP-ADRESS.nip.io:8080/auth/google/callback`

> **OBS:** Google tillåter inte rena IP-adresser som Redirect URI (t.ex. `http://192.168.1.5`). Använd tjänsten `nip.io` (t.ex. `10.151.168.5.nip.io`) eller ett riktigt domännamn.

## 📦 Installation & Körning

### 1. Klona och konfigurera
Skapa en fil `.env` i mappen `backend/`:

```bash
# backend/.env
CLIENT_ID=DITT_GOOGLE_CLIENT_ID
CLIENT_SECRET=DIN_GOOGLE_CLIENT_SECRET
# CLIENT_ORIGIN kan utelämnas, hanteras automatiskt.
# REDIRECT_URI ska vara bortkommenterad för att stödja dynamiska hosts.
```

### 2. Starta med Docker
Från rotmappen (där `docker-compose.yml` ligger):

```bash
# Bygg och starta i bakgrunden
docker-compose up -d --build
```

Appen är nu tillgänglig på **port 8080** (via Nginx som proxar till backend).
*   Lokal åtkomst: [http://localhost:8080](http://localhost:8080)
*   Nätverksåtkomst: `http://<DIN-IP>.nip.io:8080`

### 3. Loggar
Loggar sparas persistent i mappen `logs/` i projektets rot:
*   `logs/backend/server.log`: Applikationsloggar och fel från Node.js.
*   `logs/frontend/access.log`: Nginx trafiklogg.
*   `logs/frontend/error.log`: Nginx fellogg.

### 4. Uppdatera appen
Om du ändrar kod eller konfiguration:

```bash
docker-compose down
docker-compose up -d --build
```

## 📁 Projektstruktur

```
.
├── docker-compose.yml   # Orkestrering av tjänster
├── logs/                # Mapp för loggfiler (skapas automatiskt)
├── backend/             # Node.js API
│   ├── Dockerfile
│   ├── server.js        # Huvudlogik och API-endpoints
│   └── .env             # Hemligheter (skapa denna!)
└── frontend/            # React App
    ├── Dockerfile
    ├── nginx.conf       # Nginx-konfiguration för proxy
    ├── vite.config.js
    └── src/             # React källkod
```

## ❓ Felsökning

**Fel: `redirect_uri_mismatch`**
*   Kontrollera att adressen i webbläsaren stämmer EXAKT med vad som står i Google Cloud Console under "Authorized redirect URIs".
*   Se till att `REDIRECT_URI` är **bortkommenterad** i `backend/.env` så servern kan anpassa sig dynamiskt.

**Fel: Inloggningen loopar bara**
*   Detta kan bero på att cookies inte sparas. Testa en annan webbläsare eller stäng av strikt cookie-blockering.

**Fel: "Inga kurser hittades"**
*   Kontrollera att kontot du loggar in med är registrerat som lärare i Classroom.
