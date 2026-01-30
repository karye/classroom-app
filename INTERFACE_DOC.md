# Dokumentation av Användargränssnitt & Funktionalitet

Detta dokument beskriver design och interaktion i "Classroom Matrix Dashboard".

## 1. Gränssnittsöversikt

Applikationen har en konsekvent layout med två huvuddelar:
1.  **Toppmeny (Global):**
    *   Navigering mellan vyer (Matrix, Stream, Todo).
    *   Kursväljare.
    *   **Smart Uppdatering:** En uppdateringsknapp som anpassar sig. Har du valt en kurs uppdateras bara den. Har du valt "Alla" uppdateras hela systemet.
2.  **Verktygsrad (Kontextuell):**
    *   En enhetlig rad under menyn som innehåller vy-specifika filter, sökfält och exportknappar.

---

## 2. Huvudmoduler

### A. Matrisen (Matrix View)
En översikt av elevresultat.
*   **Visuellt språk:** 
    *   **Ljusblått:** Uppgifter du behöver rätta.
    *   **Färgskala:** Betygsatta prov.
    *   **Vitt/Grönt:** Färdiga uppgifter utan betyg.
*   **Export:** Klicka "Exportera Excel" för att öppna ett förhandsgranskningsfönster där du kan kopiera datan eller ladda ner en Excel-anpassad CSV-fil.

### B. Stream & Loggbok (Stream View)
Ett flöde för planering och historik.
*   **Kalender:** En kompakt kalender i vänsterspalten (fast bredd) för att filtrera inlägg per datum.
*   **Loggbok:** Klicka på "Skriv" vid ett inlägg för att öppna en Markdown-editor för privata anteckningar.
*   **Export:** Exportera hela loggboken till en Markdown-fil via förhandsgranskningsfönstret.

### C. Todo (Att Göra)
Din inkorg för rättning.
*   **Sidomeny:** Lista över alla uppgifter, grupperade per ämne. 
    *   Visar (0) om allt är klart.
*   **Huvudvy:** När du väljer en uppgift visas tre tydliga tabeller:
    1.  **Att rätta:** (Röd/Blå markering).
    2.  **Klara:** (Grön markering).
    3.  **Ej inlämnade:** (Grå).
*   **Filter:** Checkboxen "Dölj utan inlämningar" i verktygsraden filtrerar bort uppgifter där ingen har lämnat in något nytt, så du kan fokusera på det som är relevant.

---

## 3. Modaler & Förhandsgranskning

Applikationen använder enhetliga modalfönster för viktiga interaktioner:
*   **Elevöversikt:** Klicka på en elev i Matrisen för att se en detaljerad, utskriftsvänlig sammanställning.
*   **Export:** Alla exporter visas först i ett fönster. Här ser du exakt vad som sparas. Du kan välja att **Kopiera text** till urklipp (t.ex. för att klistra in i ett mail) eller **Ladda ner fil**.