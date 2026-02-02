# Google Classroom Matrix Dashboard

En fullstack webbapplikation för lärare att visualisera, planera och följa elevers framsteg i Google Classroom. Appen samlar data från Classroom och Kalender i en överskådlig matris, en global "att-göra"-lista och ett veckoschema.

## 🚀 Huvudfunktioner

### 📊 Matrisvy (Heatmap)
*   **Totalöversikt:** Se alla elevers resultat i en färgkodad matris.
*   **Smart Filtrering:** Dölj automatiskt uppgifter som saknar deadline eller poäng.
*   **Visuell Hierarki:** Tydlig skillnad mellan prov (färgskala baserat på resultat) och inlämningsuppgifter (ikoner).
*   **Action-fokus:** Ljusblå markering visar omedelbart var din insats (rättning) behövs.
*   **Export:** Exportera betyg och status till Excel-kompatibel CSV.

### 📅 Schema & Planering (NY!)
*   **Veckovy:** Ett globalt schema som visar lektioner från *alla* dina aktiva kurser samtidigt.
*   **Smart Kalender-synk:** Hämtar händelser både från Classrooms kalendrar och din primära kalender (filtrerat på kurskoder).
*   **Krockhantering:** Visar överlappande lektioner snyggt sida-vid-sida.
*   **Tydlig Info:** Färgkodade kort visar kurs, grupp, tid och sal direkt.

### 📝 Stream & Loggbok
*   **Kursflöde:** Läs inlägg och material med smidig kalendernavigering.
*   **Sökbart:** Filtrera inlägg snabbt på textinnehåll.
*   **Privat Loggbok:** Skriv krypterade lektionsanteckningar kopplade till inlägg.
*   **Offline-stöd:** Cachad data visas även om nätverket svajar.

### ✅ Todo (Att Göra)
*   **Inbox Zero:** Global lista över inlämningar som väntar på rättning.
*   **Filter:** Sök på uppgifter, dölj de utan inlämningar eller utan poäng.
*   **Detaljer:** Se exakt status ("Inlämnad", "Betygsatt", "Tilldelad") och poäng för varje elev.
*   **Status-piller:** Enhetlig visualisering av status (Inlämnad, Klar, Sen) genom hela appen.

## 🛠 Teknikstack

*   **Frontend:** React (Vite), Bootstrap 5, IndexedDB (lokal cache).
*   **Backend:** Node.js, Express, Google APIs (Classroom & Calendar), **SQLite** (krypterad lagring).
*   **Infrastruktur:** Docker & Docker Compose.

## ⚙️ Förberedelser (Google Cloud)

1.  Aktivera **Google Classroom API** och **Google Calendar API**.
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
├── backend/             # Node.js API, SQLite, Rate Limiting & Calendar Sync
└── frontend/            # React App
    ├── src/components/  
    │   ├── common/      # Återanvändbara (StatusBadge, Toolbar, Modals)
    │   ├── matrix/      # Matris-specifika komponenter
    │   ├── stream/      # Stream & Kalender-komponenter
    │   ├── todo/        # Todo-listans komponenter
    │   └── ScheduleView # Globalt schema
    └── src/App.jsx      # Huvudlayout, Routing & State
```