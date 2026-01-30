# Teknisk Logik & Algoritmer

Detta dokument beskriver beräkningar, säkerhetslösningar, API-strategier och systemarkitekturen.

---

## 1. Uppgiftslogik & Visualisering

Applikationen använder en strikt logik för att visualisera uppgifter baserat på två faktorer: **Uppgiftstyp** (har den poäng?) och **Tillstånd** (status). Målet är att skilja på *prestation* (betyg) och *process* (att göra).

### A. Uppgiftstyper
Systemet skiljer automatiskt på två typer av uppgifter baserat på data från Google Classroom:
1.  **Bedömda uppgifter (Prov/Inlämningar):** Har `maxPoints > 0`. Här är resultatet (siffran) det centrala.
2.  **Kvittensuppgifter (Läxor/Info):** Har inga poäng (`maxPoints` är 0 eller null). Här är statusen (Gjort/Inte gjort) det centrala.

### B. Tillstånd & Visuellt Språk (Matrisen)

Cellerna i matrisen ändrar utseende för att signalera vad som krävs av läraren.

| Tillstånd (Google API) | Innebörd | Visuellt uttryck (Med Poäng) | Visuellt uttryck (Utan Poäng) |
| :--- | :--- | :--- | :--- |
| **Ej inlämnad**<br>`(NEW / CREATED)` | Eleven har inte gjort uppgiften. | **Vit bakgrund**<br>Grå dash `-` | **Vit bakgrund**<br>Grå dash `-` |
| **Att Rätta / Agera**<br>`(TURNED_IN)` | Eleven har lämnat in. Bollen ligger hos dig. | **Ljusblå bakgrund** (`#e7f1ff`)<br>Grön inlämningsikon ✅ | **Ljusblå bakgrund** (`#e7f1ff`)<br>Blå cirkel-ikon 🔵 |
| **Klar / Bedömd**<br>`(RETURNED)` | Du har rättat/återlämnat. | **Heatmap-färg** (se nedan)<br>Siffra (Betyget) | **Vit bakgrund**<br>Grön bock ✅ |

*Nyckelprincip:* Den **ljusblå** färgen är en "Action-signal". Allt som är blått i matrisen är saker du behöver titta på eller rätta.

### C. Heatmap-logik (Endast poänguppgifter)
När en uppgift med poäng är rättad (`RETURNED` eller har `assignedGrade`), färgas cellen baserat på prestationsnivån (procent av maxpoäng):

*   🟢 **Mörkgrön (High):** 90% - 100% (Utmärkt resultat)
*   🌳 **Gräsgrön (Good):** 70% - 89% (Bra resultat)
*   🟡 **Ljusgrön/Gul (Pass):** 50% - 69% (Godkänt)
*   🔴 **Röd (Fail):** 0% - 49% (Underkänt/Varning)

Denna heatmap gör det möjligt att snabbt scanna en klass och se mönster (t.ex. om många lyser rött på ett specifikt moment).

---

## 2. API-hantering & Rate Limiting

För att hantera Googles strikta API-kvoter ("Quota Exceeded") använder backend en skräddarsydd kö-hantering.

### Concurrency Control
Istället för att bomba API:et med hundratals parallella anrop (vilket händer om man hämtar alla inlämningar för 20 kurser samtidigt), använder servern en strypningsmekanism:
*   **Global Spärr:** Max 3 kurser bearbetas parallellt vid en "Uppdatera alla"-begäran.
*   **Detaljerad Spärr:** Inom varje kurs hämtas max 10 uppgifter parallellt.
*   **Delay:** En artificiell fördröjning på 50ms läggs in mellan varje anrop för att jämna ut belastningen över tid.

---

## 3. Export-logik

### Excel-kompatibilitet (CSV)
Exporten är optimerad för att öppnas direkt i Excel (särskilt nordiska versioner):
1.  **BOM (`\uFEFF`):** Filen inleds med en Byte Order Mark för att tvinga Excel att läsa UTF-8 (åäö) korrekt.
2.  **Separator:** Semikolon (`;`) används istället för komma.
3.  **Citattecken:** Alla fält kapslas in i citattecken för robusthet.
4.  **Fallback-värden:** Om en elev saknar betyg men har lämnat in, exporteras texten "Inlämnad" eller "Klar" i cellen istället för att lämna den tom.

---

## 4. Säkerhet & Kryptering

Privata anteckningar i loggboken skyddas med **AES-256-CBC**.
*   **Nyckel:** Unik nyckel per användare, härledd via `scrypt` från en global `MASTER_KEY` och användarens Google ID.
*   **Lagring:** Data sparas som `iv:encrypted_text` i SQLite.

---

## 5. Cachningsstrategi (IndexedDB)

Frontend använder **IndexedDB** för att lagra hela datastrukturen lokalt. Detta möjliggör blixtsnabb sidladdning och navigering mellan kurser utan att behöva vänta på nya API-anrop.