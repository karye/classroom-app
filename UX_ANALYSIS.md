# UI & UX Analys
*Dokumenterad: 2026-02-03*

Denna fil innehåller en granskning av användargränssnittet (UI) och användarupplevelsen (UX) för Classroom Matrix Dashboard, samt konkreta förslag på förbättringar.

## 1. Analys av Navigering & Struktur

### ✅ Styrkor
*   **Intuitiv Huvudmeny:** Ikonbaserad navigering (Matris, Schema, Todo, Stream) är lätt att förstå och konsekvent placerad.
*   **Enhetliga Verktygsfält:** Gemensam design för sökning och filtrering i Matris- och Todo-vyn minskar den kognitiva belastningen.
*   **Separerad Inställningsvy:** Flytten från modal till egen vy ger arbetsro och utrymme för avancerade funktioner som elevregistret.

### ⚠️ Svagheter
*   **Avsaknad av "Back"-navigering:** Från Inställningar måste användaren aktivt välja en annan vy i huvudmenyn för att komma tillbaka. Brödsmulor (Breadcrumbs) saknas.
*   **Kontextförlust:** Vid hårda filter kan det vara otydligt vilken kurs eller tidsperiod som visas.

## 2. Visuell Design (UI)

### ✅ Styrkor
*   **Färgkodning (Heatmaps):** Det semantiska färgschemat (Grön/Gul/Röd) ger läraren en omedelbar överblick över elevers prestation.
*   **Platseffektivitet:** Kompakta listor med formatet `Namn (Klass)` maximerar mängden information utan att kännas trångt.
*   **Modern Bootstrap-stil:** Rent och professionellt utseende som känns bekant för användare av moderna webbtjänster.

### ⚠️ Svagheter
*   **Kontrast:** Viss grå text (`text-muted`) ligger nära gränsen för tillgänglighet (Accessibility) på ljusa skärmar.
*   **Responsivitet:** Matrisen är optimerad för desktop. Användning på mobil eller mindre surfplattor kräver mycket horisontell scroll.

## 3. Interaktion & Feedback (UX)

### ✅ Styrkor
*   **Snabbhet genom Caching:** Användningen av `IndexedDB` gör att växling mellan vyer känns momentan.
*   **Trygg Import:** Bekräftelsemodalen vid elevimport (visar matchade vs misslyckade namn) bygger tillit till systemet.
*   **Smart Kalender-interaktion:** Möjligheten att klicka på en lektion för att filtrera "Att rätta"-listan är en kraftfull tidsbesparare.

### ⚠️ Svagheter
*   **Laddningsindikatorer:** Vid tunga operationer (global synk) visas bara en enkel spinner. En progress-bar skulle förbättra upplevelsen av väntetid.
*   **Modal-trötthet:** Appen använder många modaler för feedback. Vissa mindre bekräftelser skulle kunna ersättas av "Toasts".

---

## 4. Förslag på Förbättringar

### 🚀 Prioritet: Hög
1.  **Förloppsindikator:** Implementera en visuell bar vid "Global Synk" som visar framsteg per kurs.
2.  **Breadcrumbs:** Lägg till "Inställningar / Elevregister" i sidhuvudet med en tillbakapil.
3.  **Toasts:** Ersätt enkla bekräftelser (t.ex. "Koppling sparad") med tysta notiser i hörn.

### 💡 Prioritet: Medel
1.  **Manuellt Matchnings-stöd:** Möjlighet att manuellt para ihop en "gul" elev med en Google-elev i listan via en sökdropdown.
2.  **Tangentsbordsgenvägar:**
    *   `Ctrl + K` för sök.
    *   `1`, `2`, `3`, `4` för att byta vy.
3.  **Dark Mode:** Global switch för mörkt tema för att minska ögonbelastning vid kvällsarbete.

### 🎨 Prioritet: Låg
1.  **Customizer:** Möjlighet att välja egna färger för heatmap-gränser.
2.  **Export-mallar:** Spara inställningar för vad som ska inkluderas i CSV-exporten.
