# Teknisk Logik & Algoritmer

Detta dokument beskriver de bakomliggande beräkningarna, säkerhetslösningarna och systemarkitekturen i "Classroom Matrix Dashboard".

---

## 1. Betygslogik & Visualisering (Matrix)

Matrisen använder en kombination av absoluta och relativa värden för att ge läraren en snabb överblick.

### Procentberäkning
För uppgifter med poäng (`maxPoints > 0`) beräknas resultatet som:
`procent = (assignedGrade / maxPoints) * 100`

### Färgkodning
Färgerna i matrisen och på elevkorten styrs av följande tröskelvärden:
*   🟢 **90% - 100%:** Mörkgrön (`#52c41a`)
*   🌳 **70% - 89%:** Gräsgrön (`#95de64`)
*   🟡 **50% - 69%:** Ljusgrön/Gul (`#d9f7be`)
*   🔴 **0% - 49%:** Rödaktig (`#ffccc7`)

### Sammanfattningskolumn (MAX)
För varje ämne beräknas en sammanfattning per elev:
*   **Vid betygsatt vy:** Visar elevens **högsta uppnådda betyg** (inte snitt) inom ämnet.
*   **Vid inlämningsvy:** Visar det totala antalet godkända inlämningar (`TURNED_IN`, `RETURNED` eller betygsatta). Färgkodningen här är **relativ**; den baseras på hur den bästa eleven i klassen har presterat i just det ämnet.

### Risk-analys (⚠️)
Varningsikonen visas bredvid en elevs namn om:
*   Eleven har ett registrerat betyg som understiger **50%** i minst ett ämne (efter att ha tagit det bästa resultatet i ämnet).
*   Ämnen där eleven helt saknar resultat ignoreras i risk-analysen.

---

## 2. Säkerhet & Kryptering

Privata anteckningar i loggboken skyddas med industristandard kryptering på servern.

### Algoritm
Systemet använder **AES-256-CBC**.

### Nyckelhantering
Varje användare har en unik krypteringsnyckel som aldrig lagras i klartext:
1.  En global `MASTER_KEY` hämtas från serverns miljövariabler.
2.  En användarspecifik nyckel härleds via **scrypt** genom att kombinera `MASTER_KEY` med användarens unika **Google ID**.
3.  En slumpmässig Initialization Vector (IV) genereras för varje unik anteckning för att förhindra mönsterigenkänning.

### Lagring
Datan sparas i formatet `iv:encrypted_text` i SQLite-databasen. Om `MASTER_KEY` ändras blir gamla anteckningar oläsliga.

---

## 3. Cachningsstrategi (IndexedDB)

Appen använder en asynkron cachningsmodell för att maximera prestanda.

### Flöde vid sidladdning
1.  **Läs:** Appen hämtar omedelbart senast kända data från `IndexedDB` (om den finns).
2.  **Visa:** Gränssnittet renderas direkt med den cachade datan.
3.  **Validera:** Användaren ser en tidsstämpel för datans ålder.
4.  **Uppdatera:** Vid manuell refresh ersätts datan i `IndexedDB` och vyn uppdateras asynkront.

### Datastruktur
Cachen är uppdelad i tre "Object Stores" i databasen `ClassroomMatrixDB`:
*   `course_cache_ID`: Innehåller elever, coursework och alla inlämningar för en kurs.
*   `stream_cache_ID`: Innehåller alla announcements för en kurs.
*   `todo_cache_data`: Innehåller den globala listan över alla väntande inlämningar.

---

## 4. Todo-kategorisering

I Todo-vyn delas eleverna upp baserat på inlämningens `state` från Google API:

1.  **Att rätta:** `state === 'TURNED_IN'`. (Högsta prioritet, sorteras på tid).
2.  **Klara:** `state === 'RETURNED'` eller om ett betyg (`assignedGrade`) har registrerats.
3.  **Ej inlämnade:** `state === 'NEW'` eller `state === 'CREATED'`.

### Globala Filter
Innan rendering körs en filter-logik som kontrollerar både uppgiftens titel och dess ämnesnamn mot användarens sparade sökord. Om en matchning hittas (case-insensitive) exkluderas hela objektet från databehandlingen.
