import React from 'react';

const MatrixTable = ({ 
    groupedWork, 
    sortedStudents, 
    expandedTopics, 
    setExpandedTopics, 
    selectedStudent, 
    setSelectedStudent, 
    details, 
    getSubmission, 
    getCellBackgroundColor, 
    getSubmissionText, 
    getGradeColorByPercent, 
    isStudentAtRisk,
    showGraded,
    showHeatmap,
    maxSubmissionsPerGroup 
}) => {
    return (
        <div className="flex-grow-1 overflow-auto matrix-wrapper">
            <table className="table table-sm table-hover mb-0 matrix-table">
                <thead>
                    <tr>
                        <th className="sticky-corner-1 align-middle ps-3">ELEV</th>
                        {groupedWork.map(group => {
                            const isExpanded = expandedTopics[group.id];
                            return (
                            <th key={group.id} colSpan={isExpanded ? group.assignments.length + 1 : 1} onClick={() => setExpandedTopics(prev => ({ ...prev, [group.id]: !prev[group.id] }))} className="sticky-header-topic text-center px-1" style={{ cursor: 'pointer', maxWidth: isExpanded ? 'none' : '90px' }}>
                                <div className="d-flex align-items-center justify-content-center gap-1 h-100">
                                     <i className={`bi bi-${isExpanded ? 'dash-square' : 'plus-square'} small opacity-50 flex-shrink-0`}></i>
                                     <span className="line-clamp-2">{group.name}</span>
                                </div>
                            </th>
                        );
                        })}
                    </tr>
                    <tr>
                        <th className="sticky-corner-2 ps-3 text-start"><small className="text-muted fw-normal">{sortedStudents.length} st</small></th>
                        {groupedWork.map(group => {
                            const isExpanded = expandedTopics[group.id];
                            return (
                            <React.Fragment key={group.id}>
                                {isExpanded && group.assignments.map((cw, idx) => (
                                    <th key={cw.id} className="sticky-header-assign">
                                        <div className="line-clamp-4" style={{ fontSize: '0.6rem' }}>
                                            <a href={cw.alternateLink} target="_blank" rel="noreferrer" className="text-decoration-none text-muted">{cw.title}</a>
                                        </div>
                                    </th>
                                ))}
                                <th className="sticky-header-assign sticky-header-summary text-center" style={{ backgroundColor: '#f8f9fa' }}>
                                    <div className="d-flex align-items-center justify-content-center h-100">
                                        <i className="bi bi-bag-check text-muted" style={{ fontSize: '0.9rem' }}></i>
                                    </div>
                                </th>
                            </React.Fragment>
                        );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedStudents.map((student, index) => {
                        const atRisk = isStudentAtRisk(student.userId, details.submissions, groupedWork);
                        return (
                        <tr key={student.userId} className={selectedStudent === student.userId ? 'selected-row' : ''}>
                            <td className="sticky-col-student align-middle ps-3" onClick={() => setSelectedStudent(selectedStudent === student.userId ? null : student.userId)} style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted small" style={{ minWidth: '20px' }}>{index + 1}.</span>
                                    {student.profile.photoUrl ? (
                                        <img src={student.profile.photoUrl} alt="" className="rounded-circle border" style={{ width: '24px', height: '24px' }} />
                                    ) : (
                                        <div className="bg-light rounded-circle border d-flex align-items-center justify-content-center text-muted" style={{ width: '24px', height: '24px' }}>
                                            <i className="bi bi-person" style={{ fontSize: '0.8rem' }}></i>
                                        </div>
                                    )}
                                    <div className="text-truncate">
                                        <span className="fw-bold text-dark">{student.profile.name.fullName}</span>
                                        {student.studentClass && <span className="student-meta">({student.studentClass})</span>}
                                    </div>
                                    {atRisk && <i className="bi bi-exclamation-triangle-fill text-danger ms-1" title="Varning"></i>}
                                </div>
                            </td>
                            {groupedWork.map(group => {
                                const isExpanded = expandedTopics[group.id];
                                let maxGrade = -1, maxGradePercent = -1, hasGrade = false;
                                const cells = group.assignments.map((cw, idx) => {
                                    const sub = getSubmission(student.userId, cw.id);
                                    if (sub && typeof sub.assignedGrade === 'number') {
                                        hasGrade = true;
                                        if (cw.maxPoints > 0) {
                                            const pct = (sub.assignedGrade / cw.maxPoints) * 100;
                                            if (pct > maxGradePercent) maxGradePercent = pct;
                                        }
                                        if (sub.assignedGrade > maxGrade) maxGrade = sub.assignedGrade;
                                    }
                                    if (!isExpanded) return null;
                                    return (
                                        <td key={cw.id} className="grade-cell text-center p-0" style={{ backgroundColor: getCellBackgroundColor(sub, cw), fontSize: '0.75rem' }}>
                                            <a href={sub?.alternateLink || cw.alternateLink} target="_blank" rel="noreferrer" className="grade-link w-100 h-100 d-flex align-items-center justify-content-center text-decoration-none text-reset">{getSubmissionText(sub, cw)}</a>
                                        </td>
                                    );
                                });

                                let summaryContent = '-', summaryStyle = { fontSize: '0.8rem', backgroundColor: '#f8f9fa' };
                                if (showGraded) {
                                    if (showHeatmap) {
                                        summaryStyle.backgroundColor = getGradeColorByPercent(maxGradePercent);
                                        summaryStyle.color = maxGradePercent >= 90 ? 'white' : 'inherit';
                                    }
                                    summaryContent = hasGrade ? maxGrade : '-';
                                } else {
                                    let turnInCount = 0;
                                    group.assignments.forEach(cw => {
                                        const sub = getSubmission(student.userId, cw.id);
                                        if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) turnInCount++;
                                    });
                                    const submissionPct = (maxSubmissionsPerGroup[group.id] || 0) > 0 ? (turnInCount / maxSubmissionsPerGroup[group.id]) * 100 : 0;
                                    
                                    if (showHeatmap) {
                                        summaryStyle.backgroundColor = getGradeColorByPercent(submissionPct);
                                        summaryStyle.color = submissionPct >= 90 ? 'white' : 'inherit';
                                    }
                                    summaryContent = turnInCount;
                                }

                                return (
                                    <React.Fragment key={group.id}>
                                        {cells}
                                        <td className="text-center fw-bold align-middle sticky-header-summary" style={summaryStyle}>{summaryContent}</td>
                                    </React.Fragment>
                                );
                            })}
                        </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="footer-row">
                        <td className="sticky-col-student text-end pe-3">Snitt</td>
                        {groupedWork.map(group => {
                            const isExpanded = expandedTopics[group.id];
                            return (
                                <React.Fragment key={group.id}>
                                    {isExpanded && group.assignments.map((cw, idx) => (
                                        <td key={cw.id} className="text-center" style={{ fontSize: '0.7rem' }}>
                                            {(() => {
                                                let sum = 0, count = 0;
                                                details.students.forEach(std => {
                                                    const sub = getSubmission(std.userId, cw.id);
                                                    if (sub && typeof sub.assignedGrade === 'number') {
                                                        sum += sub.assignedGrade;
                                                        count++;
                                                    }
                                                });
                                                return count > 0 ? (sum / count).toFixed(1) : '-';
                                            })()}
                                        </td>
                                    ))}
                                                                              <td className="text-center fw-bold sticky-header-summary" style={{ fontSize: '0.75rem', backgroundColor: '#f8f9fa' }}>
                                                                                     {(() => {
                                                                                         let content = '-';
                                                                                         let bg = '#f8f9fa';
                                                                                         let color = 'inherit';
                                     
                                                                                         if (showGraded) {
                                                                                             let sum = 0, count = 0;
                                                                                             details.students.forEach(std => {
                                                                                                 let max = -1, hasGrade = false;
                                                                                                 group.assignments.forEach(a => {
                                                                                                     const sub = getSubmission(std.userId, a.id);
                                                                                                     if (sub && typeof sub.assignedGrade === 'number') {
                                                                                                         hasGrade = true;
                                                                                                         if (sub.assignedGrade > max) max = sub.assignedGrade;
                                                                                                     }
                                                                                                 });
                                                                                                 if (hasGrade) { sum += max; count++; }
                                                                                             });
                                                                                             const avg = count > 0 ? (sum / count).toFixed(1) : null;
                                                                                             content = avg || '-';
                                                                                             
                                                                                             if (avg && showHeatmap) {
                                                                                                 const pct = (parseFloat(avg) / group.assignments[0].maxPoints) * 100; // Simplified pct
                                                                                                 bg = getGradeColorByPercent(pct);
                                                                                                 color = pct >= 90 ? 'white' : 'inherit';
                                                                                             }
                                                                                         } else {
                                                                                             let totalCount = 0, studentCount = 0;
                                                                                             details.students.forEach(std => {
                                                                                                 let count = 0;
                                                                                                 group.assignments.forEach(a => {
                                                                                                     const sub = getSubmission(std.userId, a.id);
                                                                                                     if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) count++;
                                                                                                 });
                                                                                                 totalCount += count;
                                                                                                 studentCount++;
                                                                                             });
                                                                                             const avg = studentCount > 0 ? (totalCount / studentCount).toFixed(1) : null;
                                                                                             content = avg || '-';
                                     
                                                                                             if (avg && showHeatmap) {
                                                                                                 const pct = (maxSubmissionsPerGroup[group.id] || 0) > 0 ? (parseFloat(avg) / maxSubmissionsPerGroup[group.id]) * 100 : 0;
                                                                                                 bg = getGradeColorByPercent(pct);
                                                                                                 color = pct >= 90 ? 'white' : 'inherit';
                                                                                             }
                                                                                         }
                                                                                         return <div style={{ backgroundColor: bg, color: color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{content}</div>;
                                                                                     })()}
                                                                                 </td>                                </React.Fragment>
                            )
                        })}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default MatrixTable;
