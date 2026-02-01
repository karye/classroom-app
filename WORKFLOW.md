# 🎓 Lärarens Arbetsflöde & Systemarkitektur

Detta dokument beskriver det pedagogiska och tekniska ekosystemet för läraren som använder denna applikation. Syftet är att säkerställa att all framtida utveckling stödjer det faktiska arbetssättet och respekterar integrationerna mellan olika system.

---

## 1. Ekosystemet & Roller

Skolan använder en kedja av verktyg där data flödar i en specifik riktning. Det är kritiskt att förstå att **Studybee** inte är en databas vi skriver till, utan en *visningsyta* som speglar Google Classroom.

### 🔗 Flödesschema
`Exam.net / Prov` ➔ `Google Classroom` ➔ `Studybee` ➔ `Elev & Vårdnadshavare`

### Systemens Roll
*   **Exam.net / Papper:** Där det faktiska elevarbetet sker vid prov.
*   **Google Classroom (Motorn):** Den centrala databasen. Här lagras inlämningar, poäng, betyg och status.
    *   *Det är hit vår Dashboard måste skriva för att påverka något.*
*   **Studybee (Visningsytan):** Ett lager ovanpå Classroom som visualiserar betyg och matriser för eleverna. Den har inget öppet API för skrivning; den synkar direkt mot Classroom.
*   **Classroom Matrix Dashboard (Hubben):** Lärarens verktyg för överblick, planering och snabb administration.

---

## 2. Bedömningsfilosofi & Hantering

Läraren skiljer tydligt på "tunga" bedömningsmoment och "vardagligt" arbete. Appen måste stödja båda flödena utan att blanda ihop dem.

### A. Tunga Moment (Prov & Inlämningsuppgifter)
Dessa är summativa eller större formativa moment.
*   **Källa:** Ofta Exam.net eller större inlämningar i Classroom.
*   **Skala:** Läraren använder ofta en poängskala, t.ex. **0-20 poäng**.
*   **Hantering:**
    *   Bedömning sker ofta manuellt.
    *   Poängen matas in i Google Classroom (eller via denna Dashboard i framtiden).
    *   Resultatet syns som ett betyg/värde i Studybee.

### B. Vardagliga Uppgifter (Mängdträning/Checkpoints)
Dessa är moment för att hålla tempot och se att eleverna hänger med.
*   **Syfte:** Att se *att* det är gjort, inte nödvändigtvis *hur bra* det är gjort i detalj.
*   **Hantering idag:** Kräver många klick i Classroom för att bara markera "Sett och godkänt".
*   **Önskat läge (Quick-Return):**
    *   Dessa uppgifter ska inte poängsättas.
    *   De ska endast markeras som **"Returned"** (Återlämnad/Klar) i Classroom.
    *   När detta görs försvinner de från lärarens "Att göra"-lista och markeras som gröna i Studybee.

---

## 3. Lektionslogik & Planering

Arbetet i klassrummet är cykliskt. Planering leder till genomförande, som leder till reflektion/loggning.

### Nuvarande Arbetssätt
*   Läraren skriver en **logg/sammanfattning** i Google Classroom-flödet ("Stream") i slutet av varje lektion.
*   Detta fungerar som minnesanteckning för eleverna och läraren om vad som gicks igenom.

### Vision: "Sluta Cirkeln"
Läraren vill kunna se historiken i sitt schema.
1.  **Skriv:** Läraren skriver loggen i Stream-vyn (som vanligt).
2.  **Koppla:** Systemet (denna app) identifierar vilken lektion i schemat som just avslutades och kopplar texten dit.
3.  **Visualisera:** När läraren tittar i **Kalender-vyn** bakåt i tiden, ska dessa loggar synas på de gamla lektionsblocken.
    *   *Värde:* "Vad gjorde vi förra tisdagen med TE23A?" ➔ En blick i kalendern ger svaret direkt.

---

## 4. Dashboardens Roll & Krav

Denna applikation ("Classroom Matrix Dashboard") ska fungera som det optimerade gränssnittet för läraren.

### Kravspecifikation
1.  **Överblick (Matrisen):** Måste ge en omedelbar bild av "röda hål" (elever som halkar efter) tvärs över alla moment.
2.  **Filter (Inställningar):** Läraren har många gamla eller inaktiva Classroom-kurser. Appen måste respektera filtret **"Dina klassrum"** så att menyer, matriser och Todos endast visar relevanta, aktiva kurser.
3.  **Effektivitet (Todo):** Måste minimera klick. Att "bocka av" en enkel uppgift ska gå på en sekund, inte fem.
4.  **Autonomi:** Appen ska kännas snabb och smart (därav `useMemo` och lokal cachning), men datan måste vara sann mot Google Classroom.

### Framtida "Write"-funktioner
För att fullt ut stödja arbetssättet måste vi på sikt gå från "Read-Only" till att kunna skriva:
*   **Quick-Return:** Skicka `studentSubmission.return` till Google API.
*   **Poängsättning:** Skicka `studentSubmission.assignedGrade` till Google API.
*   **Logg-publicering:** Kunna skicka en lokal loggboksanteckning som ett `Announcement` till Classroom.
