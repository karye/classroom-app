# Google Classroom Matrix Dashboard

En fullstack webbapplikation för lärare att visualisera och följa elevers framsteg i Google Classroom. Appen presenterar data i en överskådlig matris (Heatmap) där rader representerar elever och kolumner representerar uppgifter, grupperade efter ämnen (Topics).

## 🚀 Huvudfunktioner

*   **Matrisvy:** Samlad vy av alla elevers resultat i en kurs med färgkodning.
*   **Stream & Loggbok:**
    *   Läs flödet (Announcements) i en kompakt vy grupperat per månad.
    *   **Privat Loggbok:** Skriv krypterade lektionsanteckningar kopplade till inlägg.
*   **Todo (Att Göra):**
    *   Global lista ("Inbox Zero") över alla inlämningar som väntar på rättning.
    *   **Kategorisering:** Se inlämnade, klara och ej påbörjade elever separat.
    *   **Ämnesgruppering:** Uppgifter i listan grupperas efter ämne för bättre arbetsflöde.
    *   **Tangentbordsnavigering:** Bläddra snabbt mellan uppgifter med piltangenterna.
*   **Globala Inställningar:** 
    *   Exkludera specifika uppgifter eller hela ämnen baserat på sökord (t.ex. dölj "Lunch" eller "Närvaro").
    *   Inställningar sparas permanent på servern och synkas mellan dina enheter.
*   **Smart Cachning:** Alla vyer laddas omedelbart från **IndexedDB** för att hantera stora datamängder utan begränsningar.

## 🛠 Teknikstack

*   **Frontend:** React (Vite), Bootstrap 5, IndexedDB (lokal lagring).
*   **Backend:** Node.js, Express, Google APIs, **SQLite** (krypterad loggbok och användarinställningar).
*   **Infrastruktur:** Docker & Docker Compose.

## ⚙️ Förberedelser (Google Cloud)

För att appen ska fungera krävs ett projekt i Google Cloud Platform (GCP).

1.  Aktivera **Google Classroom API**.
2.  Skapa ett **OAuth 2.0 Client ID** (Web application).
3.  Konfigurera **Authorized JavaScript origins**: `http://localhost:8080`
4.  Konfigurera **Authorized redirect URIs**: `http://localhost:8080/auth/google/callback`

## 📦 Installation & Körning

1.  Skapa filen `backend/.env`:
    ```bash
    CLIENT_ID=DITT_GOOGLE_CLIENT_ID
    CLIENT_SECRET=DIN_GOOGLE_CLIENT_SECRET
    MASTER_KEY=valfri_hemlig_nyckel_för_kryptering
    ```
2.  Starta med Docker:
    ```bash
    docker compose up -d --build
    ```
3.  Öppna: [http://localhost:8080](http://localhost:8080)

## 📁 Projektstruktur

```
.
├── backend/             # Node.js API & SQLite
│   ├── server.js        # API & OAuth-logik
│   └── database.js      # Databasschema
└── frontend/            # React App
    ├── src/App.jsx      # Huvudlayout & State
    └── src/components/  # Vy-komponenter (Matrix, Stream, Todo)
```