# Google Classroom Matrix Dashboard

En fullstack webbapplikation för lärare att visualisera och följa elevers framsteg i Google Classroom. Appen presenterar data i en överskådlig matris (Heatmap) och erbjuder effektiva verktyg för rättning och loggföring.

## 🚀 Huvudfunktioner

*   **Matrisvy (Heatmap):** 
    *   Samlad vy av alla elevers resultat med färgkodning baserad på prestation.
    *   **Visuell Hierarki:** Tydlig skillnad mellan betygsatta prov (färgskala) och inlämningsuppgifter (ikoner).
    *   **Action-fokus:** Ljusblå markering visar omedelbart var din insats (rättning) behövs.
*   **Stream & Loggbok:**
    *   Läs flödet (Announcements) med en stabil, icke-hoppande kalendernavigering.
    *   **Privat Loggbok:** Skriv krypterade lektionsanteckningar (Markdown) kopplade till inlägg.
*   **Todo (Att Göra):**
    *   Global lista ("Inbox Zero") över inlämningar som väntar på rättning.
    *   **Smart Uppdatering:** Uppdatera hela inkorgen eller enbart det aktiva klassrummet för snabbare respons.
    *   **Filter:** Dölj uppgifter som saknar inlämningar för att fokusera på det väsentliga.
*   **Säker Export:** 
    *   Förhandsgranska all data (CSV/Excel för betyg, Markdown för loggbok) i ett modal-fönster innan nedladdning.
    *   Excel-kompatibel export (med BOM och semikolon-separator).
*   **Prestanda:** 
    *   **Smart API-hantering:** Inbyggd "trafikpolis" (Rate Limiting) som förhindrar att Googles API-kvoter överskrids, även vid stora datamängder.
    *   **IndexedDB:** Blixtsnabb laddning av cachad data.

## 🛠 Teknikstack

*   **Frontend:** React (Vite), Bootstrap 5, IndexedDB.
*   **Backend:** Node.js, Express, Google APIs, **SQLite** (krypterad lagring).
*   **Infrastruktur:** Docker & Docker Compose.

## ⚙️ Förberedelser (Google Cloud)

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

Projektet är modulärt uppbyggt för enklare underhåll:

```
.
├── backend/             # Node.js API, SQLite & Rate Limiting
└── frontend/            # React App
    ├── src/components/  
    │   ├── common/      # Återanvändbara (Toolbar, Modals, Spinners)
    │   ├── matrix/      # Matris-specifika komponenter
    │   ├── stream/      # Stream & Kalender-komponenter
    │   └── todo/        # Todo-listans komponenter
    └── src/App.jsx      # Huvudlayout & Routing
```
