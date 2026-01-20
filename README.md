# Google Classroom Matrix Dashboard

En kraftfull och överskådlig webbapplikation för lärare att följa elevers framsteg i Google Classroom. Appen sammanställer data från kurser, uppgifter och inlämningar i en kompakt matrisvy.

## Huvudfunktioner

*   **Google-inloggning:** Säker inloggning med Google-konto för att komma åt dina Classroom-kurser.
*   **Kursmatris:** Se alla elever (rader) och uppgifter (kolumner) i en tydlig tabell.
*   **Ämnesgruppering:** Uppgifter grupperas automatiskt efter ämnen (Topics) från Classroom.
*   **Betygslogik (Max-betyg):** Appen räknar ut det högsta betyget en elev fått inom ett specifikt ämne, vilket gör det enkelt att se om ett kunskapsmål är uppnått.
*   **Kollapsbara Ämnen:** Minimera ämnesgrupper för att bara se resultatet (Max-betyg), eller expandera för att se detaljer för varje enskild uppgift.
*   **Färgkodning:** Cellerna färgkodas automatiskt baserat på betyget (0-20 skala):
    *   🔴 **Röd (< 10):** Ej godkänt
    *   🟢 **Ljusgrön (10-13):** Godkänt
    *   🟢 **Mellangrön (14-15):** Bra
    *   🌟 **Mörkgrön (16-20):** Utmärkt
*   **Sök & Filtrera:** Filtrera snabbt fram specifika uppgifter i tabellen.
*   **Live-uppdatering:** En dedikerad uppdateringsknapp per kurs hämtar den senaste datan direkt från Google Classroom.

## Teknikstack

*   **Frontend:** React (Vite), Axios för API-anrop.
*   **Backend:** Node.js, Express.
*   **API:** Google Classroom API (v1) via `googleapis`.
*   **Autentisering:** OAuth2 med sessioner via `cookie-session`.

## Installation & Uppstart

### Förutsättningar
*   Ett projekt i [Google Cloud Console](https://console.cloud.google.com/) med Classroom API aktiverat.
*   OAuth 2.0-klient-ID och klienthemlighet.

### Backend
1. Gå till `backend/`-mappen.
2. Skapa en `.env`-fil med följande innehåll:
   ```env
   CLIENT_ID=ditt_client_id
   CLIENT_SECRET=din_client_secret
   REDIRECT_URI=http://localhost:3000/auth/google/callback
   ```
3. Kör `npm install`.
4. Starta med `node server.js`.

### Frontend
1. Gå till `frontend/`-mappen.
2. Kör `npm install`.
3. Starta med `npm run dev`.
4. Öppna [http://localhost:5173](http://localhost:5173) i din webbläsare.

## Användning

1. Logga in med ditt Google-konto (lärare).
2. Välj en kurs i listan.
3. Klicka på **"Visa Matris"** för att se elevernas resultat.
4. Klicka på **[+]** vid ett ämne för att se alla underliggande uppgifter.
5. Använd **"Uppdatera"**-knappen om du har gjort ändringar direkt i Google Classroom som du vill se direkt i matrisen.
