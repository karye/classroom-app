# Google Classroom Matrix Dashboard

En fullstack webbapplikation för lärare att visualisera, planera och följa elevers framsteg i Google Classroom. Appen samlar data från Classroom och Kalender i en överskådlig matris, en global "att-göra"-lista och ett veckoschema.

## 🚀 Huvudfunktioner

### 📊 Matrisvy (Heatmap)
*   **Totalöversikt:** Se alla elevers resultat i en färgkodad matris.
*   **Smart Filtrering:** Dölj automatiskt uppgifter som saknar deadline eller poäng.
*   **Visuell Hierarki:** Tydlig skillnad mellan prov (färgskala baserat på resultat) och inlämningsuppgifter (ikoner).
*   **Action-fokus:** Ljusblå markering visar omedelbart var din insats (rättning) behövs.
*   **Export:** Exportera betyg och status till Excel-kompatibel CSV.

### 📅 Schema & Planering
*   **Veckovy:** Ett globalt schema som visar lektioner från *alla* dina aktiva kurser samtidigt.
*   **Smart kalender-synk:** Poängbaserad algoritm matchar lektioner till rätt kurs exakt.
*   **Interaktiv lektionslogg:** Klicka på en lektion för att läsa Classroom-inlägg och privata anteckningar för just det passet.
*   **Realtidsmatchning:** Inlägg som synkas i flödet dyker upp som ikoner i schemat omedelbart.

### 📝 Stream & Loggbok
*   **Planering framåt:** Fullt stöd för att se och förbereda anteckningar för schemalagda inlägg.
*   **Privat loggbok:** Skriv krypterade lektionsanteckningar kopplade till inlägg.
*   **Offline-stöd:** Centraliserad cache som laddas direkt vid start för omedelbar tillgång till all data.

### ✅ Todo (Att Göra)
*   **Enhetlig Filtrering:** Växla enkelt mellan "Alla", "Prov" (Poängsatta) och "Uppgifter" (Ej poängsatta).
*   **Inbox Zero:** Global lista över inlämningar som väntar på rättning.
*   **Status-piller:** Enhetlig visualisering av status (Inlämnad, Klar, Sen) genom hela appen.

### ⚙️ Inställningar & Systemdata
*   **Fullskärmsvy:** Hantera filter och kurser i en tydlig vy.
*   **Systemkoll:** Se exakt hur mycket lagringsutrymme cachen och databasen tar upp.
*   **Cache-hantering:** Rensa data för enskilda kurser vid behov.

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