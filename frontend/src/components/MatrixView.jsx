import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbSet } from '../db';

// Components
import LoadingSpinner from './common/LoadingSpinner';
import ExportPreviewModal from './common/ExportPreviewModal';
import StudentSummary from './matrix/StudentSummary';
import MatrixTable from './matrix/MatrixTable';
import StatusBadge from './common/StatusBadge';

const MatrixView = ({ courseId, courseName, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [showGraded, setShowGraded] = useState(false);
    const [showUngraded, setShowUngraded] = useState(true);
    const [showPending, setShowPending] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(localStorage.getItem('matrix_show_heatmap') !== 'false'); // Default true
    const [sortType, setSortType] = useState('name-asc');
    const [expandedTopics, setExpandedTopics] = useState({});
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // Export State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportContent, setExportContent] = useState('');
    const [exportFilename, setExportFilename] = useState('');

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

    useEffect(() => {
        localStorage.setItem('matrix_show_heatmap', showHeatmap);
    }, [showHeatmap]);

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
            // Offline/Error handling: Keep existing details if available
            if (!details) {
                // Could set an error state here if desired, but for now we just stop loading
            }
        } finally {
            setLocalLoading(false);
        }
    };

    const getSubmission = (studentId, workId) => {
        return details?.submissions?.find(s => s.userId === studentId && s.courseWorkId === workId);
    };

    const getSubmissionText = (sub, cw) => {
        const isGraded = cw && cw.maxPoints > 0;
        
        // 1. Has Grade
        if (typeof sub?.assignedGrade !== 'undefined' && sub?.assignedGrade !== null) {
            return <span className="fw-bold">{sub.assignedGrade}</span>;
        }

        // 2. No submission object (effectively CREATED)
        if (!sub) {
            return isGraded ? "" : <i className="bi bi-dash text-muted opacity-50" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
        }
        
        // 3. Graded but no grade yet (only show action-needed icon)
        if (isGraded) {
             if (sub.state === 'TURNED_IN') return <i className="bi bi-check text-success fs-6" title="Inlämnad"></i>;
             return "";
        }

        // 4. Ungraded (show simple icons)
        switch (sub.state) {
            case 'TURNED_IN': return <i className="bi bi-check text-success fs-6" title="Inlämnad"></i>;
            case 'RETURNED': return <i className="bi bi-check-all text-success fs-6" title="Klar"></i>;
            case 'RECLAIMED_BY_STUDENT': return <i className="bi bi-arrow-counterclockwise text-warning" title="Återtaget"></i>;
            default: return <i className="bi bi-dash text-muted opacity-75" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
        }
    };

    const getGradeColorByPercent = (percent) => {
        if (percent === null || typeof percent === 'undefined' || percent < 0) return 'inherit';
        if (percent < 50) return 'var(--grade-fail)'; 
        if (percent < 70) return 'var(--grade-pass)'; 
        if (percent < 90) return 'var(--grade-good)'; 
        return 'var(--grade-high)'; 
    };

    const getCellBackgroundColor = (sub, cw) => {
        const isGraded = cw && cw.maxPoints > 0;
        
        // 1. Graded work gets heatmap colors based on score (if enabled)
        if (isGraded && sub && typeof sub.assignedGrade === 'number') {
            return showHeatmap ? getGradeColorByPercent((sub.assignedGrade / cw.maxPoints) * 100) : '#ffffff';
        }
        
        if (!sub) return '#ffffff';

        switch (sub.state) {
            case 'TURNED_IN': 
                // 2. Action needed: Light blue background (only if heatmap is on)
                return showHeatmap ? 'var(--primary-bg-light)' : '#ffffff';
            case 'RETURNED': 
                // 3. Done (ungraded): White background (icon shows status)
                return '#ffffff'; 
            default: 
                return '#ffffff';
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

    const handleGenerateCSV = (name, groupedWork, students, submissions) => {
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
                         // Check for grade
                         if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
                             cellValue = sub.assignedGrade;
                             hasGrade = true;
                             if (sub.assignedGrade > maxGrade) maxGrade = sub.assignedGrade;
                             turnInCount++;
                         } else {
                             // Fallback to status
                             switch (sub.state) {
                                 case 'TURNED_IN': 
                                    cellValue = 'Inlämnad'; 
                                    turnInCount++;
                                    break;
                                 case 'RETURNED': 
                                    cellValue = 'Klar'; 
                                    turnInCount++;
                                    break;
                                 case 'RECLAIMED_BY_STUDENT': 
                                    cellValue = 'Återtaget'; 
                                    break;
                             }
                         }
                     }
                     row.push(cellValue);
                 });

                 // Add summary column for this group
                 if (showGraded) {
                     row.push(hasGrade ? maxGrade : '');
                 } else {
                     row.push(turnInCount > 0 ? turnInCount : '0');
                 }
            });
            return row;
        });

        // Add BOM and separator hint for Excel UTF-8 support
        const csvContent = '\uFEFF' + 'sep=' + SEP + '\n' + 
            [headerRow, ...bodyRows]
            .map(row => row.map(escape).join(SEP))
            .join('\n');
        
        setExportContent(csvContent);
        setExportFilename(`${name}_matrix.csv`);
        setShowExportModal(true);
    };

    if (loading && !details) {
        return <LoadingSpinner />;
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
            {/* Export Modal */}
            {showExportModal && (
                <ExportPreviewModal 
                    title="Exportera till Excel (CSV)"
                    content={exportContent}
                    filename={exportFilename}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {/* Student Summary Overlay */}
            {selectedStudentData && (
                <StudentSummary 
                    student={selectedStudentData}
                    courseName={courseName}
                    onClose={() => setSelectedStudent(null)}
                    groupedWork={groupedWork}
                    getSubmission={getSubmission}
                />
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
                             <div className="form-check form-check-inline m-0">
                                 <input className="form-check-input" type="checkbox" id="checkHeatmap" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
                                 <label className="form-check-label small fw-bold text-success" htmlFor="checkHeatmap">Heatmap</label>
                             </div>
                        </div>
                        <div className="vr h-50 opacity-25"></div>
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-sort-down text-muted"></i>
                            <select onChange={(e) => setSortType(e.target.value)} value={sortType} className="form-select form-select-sm border-0 fw-bold text-dark bg-transparent ps-0" style={{ width: 'auto', cursor: 'pointer', boxShadow: 'none' }}>
                                <option value="name-asc">Sortera: A-Ö</option>
                                <option value="name-desc">Sortera: Ö-A</option>
                                <option value="perf-struggle">Sortera: Varning</option>
                                <option value="perf-top">Sortera: Bäst</option>
                                <option value="submission-desc">Sortera: Mest gjort</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={() => handleGenerateCSV(courseName, groupedWork, details.students, details.submissions)} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold">
                        <i className="bi bi-file-earmark-spreadsheet fs-6"></i> Exportera Excel
                    </button>
                </div>
            </div>

            <MatrixTable 
                groupedWork={groupedWork}
                sortedStudents={sortedStudents}
                expandedTopics={expandedTopics}
                setExpandedTopics={setExpandedTopics}
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                details={details}
                getSubmission={getSubmission}
                getCellBackgroundColor={getCellBackgroundColor}
                getSubmissionText={getSubmissionText}
                getGradeColorByPercent={getGradeColorByPercent}
                isStudentAtRisk={isStudentAtRisk}
                showGraded={showGraded}
                showHeatmap={showHeatmap}
                maxSubmissionsPerGroup={maxSubmissionsPerGroup}
            />
        </div>
    );
};

export default MatrixView;