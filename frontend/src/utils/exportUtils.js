/**
 * Generates and downloads a CSV file from matrix data.
 */
export const handleGenerateCSV = (name, groupedWork, students, submissions, showGraded) => {
    const SEP = ';';
    const escape = (val) => `"${String(val === 0 ? 0 : (val || '')).replace(/"/g, '""')}"`;

    // Build headers
    const headerRow = ['Elev'];
    groupedWork.forEach(g => {
        g.assignments.forEach(cw => headerRow.push(`[${g.name}] ${cw.title}`));
        headerRow.push(`[${g.name}] ${showGraded ? 'MAX Betyg' : 'Antal Klara'}`);
    });
    
    // Build data rows
    const bodyRows = students.map(std => {
        const row = [std.profile.name.fullName];
        groupedWork.forEach(g => {
             let maxGrade = -1;
             let hasGrade = false;
             let turnInCount = 0;

             g.assignments.forEach(cw => {
                 const sub = submissions.find(s => s.userId === std.userId && s.courseWorkId === cw.id);
                 
                 let cellValue = '';
                 if (sub) {
                     if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
                         cellValue = sub.assignedGrade;
                         hasGrade = true;
                         if (sub.assignedGrade > maxGrade) maxGrade = sub.assignedGrade;
                         turnInCount++;
                     } else {
                         switch (sub.state) {
                             case 'TURNED_IN': cellValue = 'Inlämnad'; turnInCount++; break;
                             case 'RETURNED': cellValue = 'Klar'; turnInCount++; break;
                             case 'RECLAIMED_BY_STUDENT': cellValue = 'Återtaget'; break;
                         }
                     }
                 }
                 row.push(cellValue);
             });

             if (showGraded) {
                 row.push(hasGrade ? maxGrade : '');
             } else {
                 row.push(turnInCount > 0 ? turnInCount : '0');
             }
        });
        return row;
    });

    // Add BOM and separator hint for Excel UTF-8 support
    return '\uFEFF' + 'sep=' + SEP + '\n' + 
        [headerRow, ...bodyRows]
        .map(row => row.map(escape).join(SEP))
        .join('\n');
};
