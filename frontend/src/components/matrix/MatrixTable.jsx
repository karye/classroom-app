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
                        <th className="sticky-corner-1 align-middle ps-3">Elev</th>
                        {groupedWork.map(group => {
                            const isExpanded = expandedTopics[group.id];
                            return (
                            <th key={group.id} 
                                colSpan={isExpanded ? group.assignments.length + 1 : 1} 
                                onClick={() => setExpandedTopics(prev => ({ ...prev, [group.id]: !prev[group.id] }))} 
                                className={`sticky-header-topic text-center px-1 ${isExpanded ? 'topic-header-expanded' : ''}`} 
                                style={{ cursor: 'pointer', maxWidth: isExpanded ? 'none' : '90px' }}
                            >
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
                                        <div className="line-clamp-2" style={{ fontSize: '0.6rem' }}>
                                            <a href={cw.alternateLink} target="_blank" rel="noreferrer" className="text-decoration-none text-muted">{cw.title}</a>
                                        </div>
                                    </th>
                                ))}
                                <th className={`sticky-header-assign sticky-header-summary ${isExpanded ? 'summary-column-expanded' : 'summary-column-collapsed'}`}>
                                    <div className="summary-cell-content px-1">
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
                                
                                // Determine if this topic group is a "Points track" or "Status track"
                                const topicHasPoints = group.assignments.some(a => a.maxPoints > 0);

                                let bestWeight = -1;
                                let bestGrade = null;
                                let bestStatus = null;
                                let displayPct = 0;
                                
                                const cells = group.assignments.map((cw, idx) => {
                                    const sub = getSubmission(student.userId, cw.id);
                                    const hasGrade = typeof sub?.assignedGrade === 'number';
                                    const assignmentHasPoints = cw.maxPoints > 0;

                                    if (sub) {
                                        let currentWeight = -1;
                                        let currentPct = 0;

                                        if (topicHasPoints) {
                                            if (assignmentHasPoints) {
                                                if (hasGrade) {
                                                    currentPct = (sub.assignedGrade / cw.maxPoints) * 100;
                                                    currentWeight = 100 + currentPct;
                                                } else if (sub.state === 'RETURNED' || sub.state === 'TURNED_IN') {
                                                    currentWeight = 80;
                                                } else {
                                                    currentWeight = 5;
                                                }
                                            } else {
                                                currentWeight = 1;
                                            }
                                        } else {
                                            if (sub.state === 'RETURNED') {
                                                currentWeight = 50;
                                                currentPct = 100;
                                            } else if (sub.state === 'TURNED_IN') {
                                                currentWeight = 10;
                                                currentPct = 1;
                                            }
                                        }

                                        if (currentWeight > bestWeight) {
                                            bestWeight = currentWeight;
                                            bestGrade = hasGrade ? sub.assignedGrade : null;
                                            bestStatus = sub.state;
                                            displayPct = currentPct;
                                        }
                                    }

                                    if (!isExpanded) return null;
                                    return (
                                        <td key={cw.id} className="grade-cell text-center p-0 topic-cell-expanded" style={{ backgroundColor: getCellBackgroundColor(sub, cw, showHeatmap), fontSize: '0.75rem' }}>
                                            <a href={sub?.alternateLink || cw.alternateLink} target="_blank" rel="noreferrer" className="grade-link w-100 h-100 d-flex align-items-center justify-content-center text-decoration-none text-reset">
                                                {getSubmissionText(sub, cw)}
                                            </a>
                                        </td>
                                    );
                                });

                                let summaryContent = '-';
                                let summaryInlineStyle = { fontSize: '0.8rem' };
                                
                                if (showGraded) {
                                    if (bestWeight >= 80) {
                                        if (showHeatmap && displayPct > 0) {
                                            summaryInlineStyle.backgroundColor = getGradeColorByPercent(displayPct);
                                            summaryInlineStyle.color = displayPct >= 90 ? 'white' : 'inherit';
                                        }
                                        
                                        if (bestGrade !== null) {
                                            summaryContent = <span className="fw-bold">{bestGrade}</span>;
                                        } else {
                                            summaryContent = <i className="bi bi-check text-primary fs-6"></i>;
                                        }
                                    } else if (bestWeight !== -1) {
                                        summaryContent = '0';
                                        if (showHeatmap) summaryInlineStyle.backgroundColor = 'var(--grade-fail)';
                                    }
                                } else {
                                    let turnInCount = 0;
                                    group.assignments.forEach(cw => {
                                        const sub = getSubmission(student.userId, cw.id);
                                        if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) turnInCount++;
                                    });
                                    const submissionPct = (maxSubmissionsPerGroup[group.id] || 0) > 0 ? (turnInCount / maxSubmissionsPerGroup[group.id]) * 100 : 0;
                                    
                                    if (showHeatmap) {
                                        summaryInlineStyle.backgroundColor = getGradeColorByPercent(submissionPct);
                                        summaryInlineStyle.color = submissionPct >= 90 ? 'white' : 'inherit';
                                    }
                                    summaryContent = turnInCount;
                                }

                                return (
                                    <React.Fragment key={group.id}>
                                        {cells}
                                        <td className={`text-center fw-bold align-middle sticky-header-summary ${isExpanded ? 'summary-column-expanded topic-cell-expanded' : 'summary-column-collapsed'}`} style={summaryInlineStyle}>{summaryContent}</td>
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
                                        <td key={cw.id} className="text-center topic-cell-expanded" style={{ fontSize: '0.7rem' }}>
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
                                    <td className={`text-center fw-bold sticky-header-summary ${isExpanded ? 'summary-column-expanded topic-cell-expanded' : 'summary-column-collapsed'}`}>
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
                                                    const firstMax = group.assignments.find(a => a.maxPoints > 0)?.maxPoints || 100;
                                                    const pct = (parseFloat(avg) / firstMax) * 100;
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
                                            return <div className="summary-cell-content" style={{ backgroundColor: bg, color: color }}>{content}</div>;
                                        })()}
                                    </td>
                                </React.Fragment>
                            );
                        })}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

export default MatrixTable;