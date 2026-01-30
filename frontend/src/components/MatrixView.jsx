import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbSet } from '../db';

const MatrixView = ({ courseId, courseName, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [showGraded, setShowGraded] = useState(false);
    const [showUngraded, setShowUngraded] = useState(true);
    const [showPending, setShowPending] = useState(false);
    const [sortType, setSortType] = useState('name-asc');
    const [expandedTopics, setExpandedTopics] = useState({});
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Helper to check if a string matches any filter
    const matchesFilterList = (text, filters) => {
        if (!filters || filters.length === 0 || !text) return false;
        const lowText = text.toLowerCase();
        return filters.some(f => lowText.includes(f.toLowerCase()));
    };

    const setLocalLoading = (val) => {
        setLoading(val);
        if (onLoading) onLoading(val);
    };

    // Load from cache on mount or course change
    useEffect(() => {
        const loadCache = async () => {
            if (!courseId) return;
            setLocalLoading(true);
            try {
                const cacheKey = `course_cache_${courseId}`;
                const cached = await dbGet(cacheKey);
                if (cached) {
                    setDetails(cached.data);
                    if (onUpdate && cached.timestamp) {
                        onUpdate(new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                } else {
                    await fetchDetails(courseId);
                }
            } catch (err) {
                console.warn("Matrix cache load failed", err);
                await fetchDetails(courseId);
            } finally {
                setLocalLoading(false);
            }
        };
        loadCache();
    }, [courseId]);

    // Manual refresh
    useEffect(() => {
        if (refreshTrigger > 0 && courseId) {
            fetchDetails(courseId, true);
        }
    }, [refreshTrigger]);

    const fetchDetails = async (id, force = false) => {
        if (!id) return;
        setLocalLoading(true);
        try {
            const res = await axios.get(`/api/courses/${id}/details`);
            const now = Date.now();
            setDetails(res.data);
            const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (onUpdate) onUpdate(timeStr);
            
            await dbSet(`course_cache_${id}`, {
                timestamp: now,
                data: res.data
            });
        } catch (err) {
            console.error("Failed to fetch matrix details", err);
        } finally {
            setLocalLoading(false);
        }
    };

    const getSubmission = (studentId, workId) => {
        return details?.submissions?.find(s => s.userId === studentId && s.courseWorkId === workId);
    };

    const getSubmissionText = (sub, cw) => {
        const isGraded = cw && cw.maxPoints > 0;
        if (!sub) return isGraded ? "" : <i className="bi bi-dash-circle text-danger opacity-50" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
        if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) return <span className="fw-bold">{sub.assignedGrade}</span>;
        if (isGraded) return "";
        switch (sub.state) {
            case 'TURNED_IN': return <i className="bi bi-check text-success fs-6" title="Inlämnad"></i>;
            case 'RETURNED': return <i className="bi bi-check-all text-success fs-6" title="Klar"></i>;
            case 'RECLAIMED_BY_STUDENT': return <i className="bi bi-arrow-counterclockwise text-warning" title="Återtaget"></i>;
            default: return <i className="bi bi-dash-circle text-danger opacity-75" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
        }
    };

    const getGradeColorByPercent = (percent) => {
        if (percent === null || typeof percent === 'undefined' || percent < 0) return 'inherit';
        if (percent < 50) return '#ffccc7'; 
        if (percent < 70) return '#d9f7be'; 
        if (percent < 90) return '#95de64'; 
        return '#52c41a'; 
    };

    const getCellBackgroundColor = (sub, cw) => {
        const isGraded = cw && cw.maxPoints > 0;
        if (isGraded && sub && typeof sub.assignedGrade === 'number') {
            return getGradeColorByPercent((sub.assignedGrade / cw.maxPoints) * 100);
        }
        if (!sub) return '#ffffff';
        switch (sub.state) {
            case 'RETURNED': return '#d9f7be';
            case 'TURNED_IN': return '#f6ffed';
            default: return '#ffffff';
        }
    };

    const isStudentAtRisk = (studentId, submissions, groupedWork) => {
        for (const group of groupedWork) {
            let maxPct = -1, hasGradedSub = false;
            for (const cw of group.assignments) {
                if (cw.maxPoints > 0) {
                    const sub = submissions.find(s => s.userId === studentId && s.courseWorkId === cw.id);
                    if (sub && typeof sub.assignedGrade === 'number') {
                        hasGradedSub = true;
                        const pct = (sub.assignedGrade / cw.maxPoints) * 100;
                        if (pct > maxPct) maxPct = pct;
                    }
                }
            }
            if (hasGradedSub && maxPct < 50) return true;
        }
        return false;
    };

    const calculateTotalSubmissionCount = (studentId, submissions, groupedWork) => {
        let count = 0;
        groupedWork.forEach(group => {
            group.assignments.forEach(cw => {
                const sub = getSubmission(studentId, cw.id);
                 if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) {
                     count++;
                 }
            });
        });
        return count;
    };

    const calculateAveragePercent = (studentId) => {
        if (!details?.coursework) return 0;
        let totalPct = 0, count = 0;
        details.coursework.forEach(cw => {
            if (cw.maxPoints > 0) {
                const sub = getSubmission(studentId, cw.id);
                if (sub && typeof sub.assignedGrade === 'number') totalPct += (sub.assignedGrade / cw.maxPoints) * 100;
                count++;
            }
        });
        return count > 0 ? totalPct / count : 0;
    };

    const downloadCSV = (name, groupedWork, students, submissions) => {
        const headerRow = ['Elev'];
        groupedWork.forEach(g => {
            g.assignments.forEach(cw => headerRow.push(`[${g.name}] ${cw.title}`));
            headerRow.push(`[${g.name}] MAX`);
        });
        const bodyRows = students.map(std => {
            const row = [`"${std.profile.name.fullName}"`];
            groupedWork.forEach(g => {
                 let max = -1, hasGrade = false;
                 g.assignments.forEach(cw => {
                     const sub = submissions.find(s => s.userId === std.userId && s.courseWorkId === cw.id);
                     row.push(sub && typeof sub.assignedGrade !== 'undefined' ? sub.assignedGrade : '');
                     if (sub && typeof sub.assignedGrade === 'number') {
                         hasGrade = true;
                         if (sub.assignedGrade > max) max = sub.assignedGrade;
                     }
                 });
                 row.push(hasGrade ? max : '');
            });
            return row.join(',');
        });
        const csvContent = [headerRow.join(','), ...bodyRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}_matrix.csv`;
        link.click();
    };

    if (loading && !details) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <i className="bi bi-arrow-clockwise spin text-primary" style={{ fontSize: '3rem' }}></i>
            </div>
        );
    }

    if (!details) return null;

    // Process Data
    const topicMap = new Map(details.topics?.map(t => [t.topicId, t.name]));

    const visibleWork = details.coursework.filter(cw => {
        const matchesText = cw.title.toLowerCase().includes(filterText.toLowerCase());
        const isGraded = cw.maxPoints && cw.maxPoints > 0;
        const matchesType = (isGraded && showGraded) || (!isGraded && showUngraded);
        const matchesPending = !showPending || details.submissions.some(s => s.courseWorkId === cw.id && s.state === 'TURNED_IN');
        
        // Filter logic
        const matchesAssignmentExclude = matchesFilterList(cw.title, excludeFilters);
        const matchesTopicExclude = matchesFilterList(topicMap.get(cw.topicId), excludeTopicFilters);
        
        return matchesText && matchesType && matchesPending && !matchesAssignmentExclude && !matchesTopicExclude;
    });

    const groupedWork = [];
    const groups = {};
    const noTopic = [];
    visibleWork.forEach(cw => {
        if (cw.topicId) {
            if (!groups[cw.topicId]) groups[cw.topicId] = [];
            groups[cw.topicId].push(cw);
        } else noTopic.push(cw);
    });
    details.topics?.forEach(t => { if (groups[t.topicId]) { groupedWork.push({ id: t.topicId, name: t.name, assignments: groups[t.topicId] }); delete groups[t.topicId]; } });
    Object.keys(groups).forEach(tid => groupedWork.push({ id: tid, name: topicMap.get(tid) || 'Okänt Ämne', assignments: groups[tid] }));
    groupedWork.sort((a, b) => a.name.localeCompare(b.name, 'sv', { numeric: true }));
    if (noTopic.length > 0) groupedWork.push({ id: 'none', name: 'Övrigt', assignments: noTopic });

    const sortedStudents = [...details.students].sort((a, b) => {
        switch (sortType) {
            case 'name-desc': return b.profile.name.fullName.localeCompare(a.profile.name.fullName, 'sv');
            case 'perf-struggle': return calculateAveragePercent(a.userId) - calculateAveragePercent(b.userId);
            case 'perf-top': return calculateAveragePercent(b.userId) - calculateAveragePercent(a.userId);
            case 'submission-desc': return calculateTotalSubmissionCount(b.userId, details.submissions, groupedWork) - calculateTotalSubmissionCount(a.userId, details.submissions, groupedWork);
            default: return a.profile.name.fullName.localeCompare(b.profile.name.fullName, 'sv');
        }
    });

    const maxSubmissionsPerGroup = {};
    groupedWork.forEach(group => {
        let max = 0;
        details.students.forEach(std => {
            let count = 0;
            group.assignments.forEach(cw => {
                const sub = getSubmission(std.userId, cw.id);
                if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) count++;
            });
            if (count > max) max = count;
        });
        maxSubmissionsPerGroup[group.id] = max;
    });

    const selectedStudentData = details.students.find(s => s.userId === selectedStudent);

    return (
        <div className="d-flex flex-column h-100 position-relative">
            {/* Student Summary Overlay */}
            {selectedStudentData && (
                <div className="student-summary-overlay no-print-bg" onClick={() => setSelectedStudent(null)}>
                    <div className="student-summary-content d-flex flex-column" onClick={e => e.stopPropagation()}>
                        <div className="student-summary-header d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                                {selectedStudentData.profile.photoUrl ? (
                                    <img src={selectedStudentData.profile.photoUrl} alt="" className="rounded-circle border" style={{ width: '48px', height: '48px' }} />
                                ) : (
                                    <div className="bg-light rounded-circle border d-flex align-items-center justify-content-center text-muted" style={{ width: '48px', height: '48px' }}>
                                        <i className="bi bi-person fs-4"></i>
                                    </div>
                                )}
                                <div>
                                    <h4 className="mb-0 fw-bold">{selectedStudentData.profile.name.fullName}</h4>
                                    <span className="text-muted">{courseName}</span>
                                </div>
                            </div>
                            <div className="d-flex gap-2 no-print">
                                <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => window.print()}>
                                    <i className="bi bi-printer"></i> Skriv ut
                                </button>
                                <button className="btn btn-light" onClick={() => setSelectedStudent(null)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                        <div className="student-summary-body">
                            {groupedWork.map(group => (
                                <div key={group.id} className="mb-5">
                                    <h5 className="text-primary border-bottom pb-2 fw-bold mb-3">{group.name.toUpperCase()}</h5>
                                    <table className="table table-sm table-hover border-top">
                                        <thead>
                                            <tr className="table-light">
                                                <th className="ps-3 py-2 border-0" style={{ width: '60%' }}>UPPGIFT</th>
                                                <th className="py-2 border-0 text-center" style={{ width: '20%' }}>STATUS</th>
                                                <th className="py-2 border-0 text-end pe-3" style={{ width: '20%' }}>RESULTAT</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.assignments.map(cw => {
                                                const sub = getSubmission(selectedStudentData.userId, cw.id);
                                                let statusIcon = <i className="bi bi-dash-circle text-danger opacity-75" title="Ej inlämnad"></i>;
                                                let resultText = "-";

                                                if (sub) {
                                                    switch (sub.state) {
                                                        case 'TURNED_IN': 
                                                            statusIcon = <i className="bi bi-check text-success fs-5" title="Inlämnad"></i>;
                                                            break;
                                                        case 'RETURNED': 
                                                            statusIcon = <i className="bi bi-check-all text-success fs-5" title="Klar"></i>;
                                                            break;
                                                        case 'RECLAIMED_BY_STUDENT': 
                                                            statusIcon = <i className="bi bi-arrow-counterclockwise text-warning" title="Återtaget"></i>;
                                                            break;
                                                        default: 
                                                            statusIcon = <i className="bi bi-dash-circle text-danger opacity-75" title="Ej inlämnad"></i>;
                                                    }
                                                    if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
                                                        resultText = `${sub.assignedGrade} / ${cw.maxPoints}`;
                                                    }
                                                }

                                                return (
                                                    <tr key={cw.id} className="align-middle">
                                                        <td className="ps-3 py-1 border-bottom" style={{ fontSize: '0.85rem' }}>{cw.title}</td>
                                                        <td className="text-center py-1 border-bottom">
                                                            {statusIcon}
                                                        </td>
                                                        <td className="text-end py-1 border-bottom pe-3 fw-bold" style={{ fontSize: '0.85rem' }}>
                                                            {resultText}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="bg-white border-bottom px-4 py-1 d-flex align-items-center shadow-sm" style={{ minHeight: '45px', zIndex: 5 }}>
                <div className="d-flex align-items-center w-100 justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="input-group input-group-sm" style={{ width: '200px' }}>
                             <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                             <input type="text" className="form-control border-start-0 ps-0" placeholder="Filtrera uppgifter..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                        </div>
                        <div className="vr h-50 opacity-25"></div>
                        <div className="d-flex align-items-center gap-3">
                             <div className="form-check form-check-inline m-0">
                                 <input className="form-check-input" type="checkbox" id="checkGraded" checked={showGraded} onChange={e => setShowGraded(e.target.checked)} />
                                 <label className="form-check-label small fw-bold" htmlFor="checkGraded">Prov</label>
                             </div>
                             <div className="form-check form-check-inline m-0">
                                 <input className="form-check-input" type="checkbox" id="checkUngraded" checked={showUngraded} onChange={e => setShowUngraded(e.target.checked)} />
                                 <label className="form-check-label small fw-bold" htmlFor="checkUngraded">Uppg.</label>
                             </div>
                             <div className="form-check form-check-inline m-0">
                                 <input className="form-check-input" type="checkbox" id="checkPending" checked={showPending} onChange={e => setShowPending(e.target.checked)} />
                                 <label className="form-check-label small fw-bold text-danger" htmlFor="checkPending">Att rätta</label>
                             </div>
                        </div>
                        <div className="vr h-50 opacity-25"></div>
                        <select onChange={(e) => setSortType(e.target.value)} value={sortType} className="form-select form-select-sm border-0 fw-bold text-primary bg-transparent" style={{ width: '140px' }}>
                             <option value="name-asc">Sortera: A-Ö</option>
                             <option value="name-desc">Sortera: Ö-A</option>
                             <option value="perf-struggle">Sortera: Varning</option>
                             <option value="perf-top">Sortera: Bäst</option>
                             <option value="submission-desc">Sortera: Mest gjort</option>
                         </select>
                    </div>
                    <button onClick={() => downloadCSV(courseName, groupedWork, details.students, details.submissions)} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold">
                        <i className="bi bi-file-earmark-spreadsheet fs-6"></i> Exportera Excel
                    </button>
                </div>
            </div>

            {/* Matrix Table */}
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
                                        <span className="fw-bold text-dark text-truncate me-1" style={{ maxWidth: '150px' }}>{student.profile.name.fullName}</span>
                                        {atRisk && <i className="bi bi-exclamation-triangle-fill text-danger" title="Varning"></i>}
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
                                        summaryStyle.backgroundColor = getGradeColorByPercent(maxGradePercent);
                                        summaryStyle.color = maxGradePercent >= 90 ? 'white' : 'inherit';
                                        summaryContent = hasGrade ? maxGrade : '-';
                                    } else {
                                        let turnInCount = 0;
                                        group.assignments.forEach(cw => {
                                            const sub = getSubmission(student.userId, cw.id);
                                            if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) turnInCount++;
                                        });
                                        const submissionPct = (maxSubmissionsPerGroup[group.id] || 0) > 0 ? (turnInCount / maxSubmissionsPerGroup[group.id]) * 100 : 0;
                                        summaryStyle.backgroundColor = getGradeColorByPercent(submissionPct);
                                        summaryStyle.color = submissionPct >= 90 ? 'white' : 'inherit';
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
                                                        return count > 0 ? (sum / count).toFixed(1) : '-';
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
                                                        return studentCount > 0 ? (totalCount / studentCount).toFixed(1) : '-';
                                                    }
                                                })()}
                                            </td>
                                    </React.Fragment>
                                )
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default MatrixView;
