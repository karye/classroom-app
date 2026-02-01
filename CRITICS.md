# ⚖️ Kritisk Analys & Systemutmaningar (CRITICS)

Detta dokument fungerar som en objektiv granskning av applikationens nuvarande brister, tekniska risker och begränsningar. Syftet är att belysa områden där systemet är sårbart eller där arkitekturen kan bli ett hinder i framtiden.

---

## 1. Tekniska Begränsningar & Arkitektur

### 🏎️ Prestanda vid stora datamängder
Trots implementering av `useMemo` och `IndexedDB` finns det en övre gräns för vad webbläsaren kan hantera smidigt. 
*   **Kritik:** Matrisvyn renderar hundratals (ibland tusentals) DOM-element samtidigt. För en lärare med 10+ kurser och 30+ elever i varje klass kan gränssnittet bli trögt vid scrollning och navigering.
*   **Risk:** "Reconciliation"-tiden i React ökar linjärt med antalet inlämningar, vilket kan leda till märkbar fördröjning trots optimering.

### 🗄️ SQLite som flaskhals
Nuvarande lösning använder SQLite. 
*   **Kritik:** Om appen skulle skala till en hel skola med många samtidiga användare kommer SQLite:s skriv-lås (write-locking) att bli ett problem.
*   **Risk:** Databasen är lokal för Docker-containern. Utan ordentlig backup-logik riskerar användardata (loggböcker) att gå förlorade vid en korrupt volym.

---

## 2. Externa Beroenden (Google API)

### 🛑 Rate Limiting & Quotas
Appen är helt beroende av Google Classroom och Calendar API.
*   **Kritik:** Google har strikta begränsningar för hur många anrop som får göras per sekund/minut. Vår "Smart Synk" för kalendern och Todo-listan gör många anrop vid varje uppdatering.
*   **Risk:** Om en lärare har extremt många kurser kan API-kvoten nås, vilket resulterar i att appen slutar fungera ("429 Too Many Requests") under en period.

### 🔄 Datasynkronisering (Lag)
Appen bygger på en lokal cache.
*   **Kritik:** Det finns ingen "push"-notifiering från Google. Om en lärare rättar en uppgift direkt i Google Classroom (eller via Studybee), vet inte vår app om det förrän läraren manuellt trycker på "Uppdatera".
*   **Konsekvens:** Risk för att läraren fattar beslut baserat på gammal information om hen glömmer att uppdatera vyn.

---

## 3. Användarupplevelse (UX)

### 🧩 Information Overload
Dashboarden och Matrisen strävar efter att visa "allt".
*   **Kritik:** Gränssnittet är extremt datatätt. För en ny användare kan tröskeln vara hög ("Var ska jag titta?"). Den ultrakompakta designen (1px padding) sparar plats men offrar läsbarhet och luftighet.
*   **Kritik:** Appen saknar en guidad "Onboarding".

### 🌓 Visuell konsistens
*   **Kritik:** Många element förlitar sig på Bootstrap-standarder. Medan det är funktionellt, saknar appen en unik visuell identitet som känns modern och inspirerande. Frånvaron av "Dark Mode" är en brist för lärare som arbetar kvällstid.

---

## 4. Arbetsflöde & Integrationer

### 🌉 Studybee-glappet
Eftersom Studybee saknar API sker integrationen via en "omväg" (Classroom).
*   **Kritik:** Vi kan aldrig garantera *när* Studybee väljer att synka från Classroom. Läraren kan markera en uppgift som "Klar" i vår app, se den försvinna, men eleven ser den fortfarande som "Ej klar" i Studybee under flera timmar. Detta kan skapa förvirring och onödig kommunikation.

### ✍️ Den enkelriktade naturen
*   **Kritik:** Appen är fortfarande till stor del "Read-Only". Kraften i ett dashboard-verktyg minskar drastiskt när användaren ändå måste lämna appen för att utföra de faktiska handlingarna (t.ex. returnera en uppgift). Fram till att "Quick-Return" är implementerad är appen mer av ett analysverktyg än ett produktivitetsverktyg.

---

## 5. Säkerhet

### 🔑 Krypteringens stabilitet
*   **Kritik:** Loggboken krypteras med en `MASTER_KEY`. Om denna nyckel ändras eller tappas bort i servermiljön går alla befintliga loggar förlorade då de inte längre kan dekrypteras. 
*   **Kritik:** Sessioner lagras i cookies. Även om de är krypterade, saknar appen avancerade säkerhetsfunktioner som tvåfaktorsautentisering (utöver vad Google erbjuder).
