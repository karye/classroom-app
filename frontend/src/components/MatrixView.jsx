import React, { useState, useEffect, useMemo } from 'react';
import { useMatrixData } from '../hooks/useMatrixData';
import { 
    processMatrixData, 
    calculateAveragePercent, 
    calculateTotalSubmissionCount,
    isStudentAtRisk,
    getCellBackgroundColor,
    getGradeColorByPercent,
    getSubmission
} from '../utils/matrixUtils';
import { handleGenerateCSV } from '../utils/exportUtils';

// Components
import LoadingSpinner from './common/LoadingSpinner';
import ExportPreviewModal from './common/ExportPreviewModal';
import StudentSummary from './matrix/StudentSummary';
import MatrixTable from './matrix/MatrixTable';
import MatrixToolbar from './matrix/MatrixToolbar';

const MatrixView = ({ courseId, courseName, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
    // UI State
    const [filterText, setFilterText] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState('ungraded'); 
    const [hideNoDeadline, setHideNoDeadline] = useState(localStorage.getItem('matrix_hide_nodeadline') === 'true');
    const [showHeatmap, setShowHeatmap] = useState(localStorage.getItem('matrix_show_heatmap') !== 'false');
    const [sortType, setSortType] = useState('name-asc');
    const [expandedTopics, setExpandedTopics] = useState({});
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // Export State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportData, setExportData] = useState({ content: '', filename: '' });

    // Data Hook
    const { details, loading, error } = useMatrixData(courseId, refreshTrigger, onUpdate, onLoading);

    // Persistence
    useEffect(() => { localStorage.setItem('matrix_show_heatmap', showHeatmap); }, [showHeatmap]);
    useEffect(() => { localStorage.setItem('matrix_hide_nodeadline', hideNoDeadline); }, [hideNoDeadline]);

    // Derived Data (Filtering, Grouping, Sorting)
    const { groupedWork, maxSubmissionsPerGroup } = useMemo(() => {
        return processMatrixData(details, { filterText, assignmentFilter, hideNoDeadline, excludeFilters, excludeTopicFilters });
    }, [details, filterText, assignmentFilter, hideNoDeadline, excludeFilters, excludeTopicFilters]);

    const sortedStudents = useMemo(() => {
        if (!details?.students) return [];
        return [...details.students].sort((a, b) => {
            switch (sortType) {
                case 'name-desc': return b.profile.name.fullName.localeCompare(a.profile.name.fullName, 'sv');
                case 'perf-struggle': return calculateAveragePercent(details, a.userId) - calculateAveragePercent(details, b.userId);
                case 'perf-top': return calculateAveragePercent(details, b.userId) - calculateAveragePercent(details, a.userId);
                case 'submission-desc': return calculateTotalSubmissionCount(details, b.userId, groupedWork) - calculateTotalSubmissionCount(details, a.userId, groupedWork);
                default: return a.profile.name.fullName.localeCompare(b.profile.name.fullName, 'sv');
            }
        });
    }, [details, sortType, groupedWork]);

    // Helpers
    const showGraded = assignmentFilter === 'graded' || assignmentFilter === 'all';
    const selectedStudentData = details?.students.find(s => s.userId === selectedStudent);

    const onExportClick = () => {
        const csv = handleGenerateCSV(courseName, groupedWork, details.students, details.submissions, showGraded);
        setExportData({ content: csv, filename: `${courseName}_matrix.csv` });
        setShowExportModal(true);
    };

    if (loading && !details) return <LoadingSpinner />;
    if (!details) return null;

    return (
        <div className="d-flex flex-column h-100 position-relative">
            {showExportModal && (
                <ExportPreviewModal 
                    title="Exportera till Excel (CSV)"
                    content={exportData.content}
                    filename={exportData.filename}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {selectedStudentData && (
                <StudentSummary 
                    student={selectedStudentData}
                    courseName={courseName}
                    onClose={() => setSelectedStudent(null)}
                    groupedWork={groupedWork}
                    getSubmission={(sid, wid) => getSubmission(details, sid, wid)}
                />
            )}

            <MatrixToolbar 
                filterText={filterText} setFilterText={setFilterText}
                assignmentFilter={assignmentFilter} setAssignmentFilter={setAssignmentFilter}
                hideNoDeadline={hideNoDeadline} setHideNoDeadline={setHideNoDeadline}
                showHeatmap={showHeatmap} setShowHeatmap={setShowHeatmap}
                sortType={sortType} setSortType={setSortType}
                onExport={onExportClick}
            />

            <MatrixTable 
                groupedWork={groupedWork}
                sortedStudents={sortedStudents}
                expandedTopics={expandedTopics}
                setExpandedTopics={setExpandedTopics}
                selectedStudent={selectedStudent}
                setSelectedStudent={setSelectedStudent}
                details={details}
                getSubmission={(sid, wid) => getSubmission(details, sid, wid)}
                getCellBackgroundColor={(sub, cw) => getCellBackgroundColor(sub, cw, showHeatmap)}
                getSubmissionText={(sub, cw) => {
                    const isGraded = cw && cw.maxPoints > 0;
                    if (typeof sub?.assignedGrade !== 'undefined' && sub?.assignedGrade !== null) return <span className="fw-bold">{sub.assignedGrade}</span>;
                    if (!sub) return isGraded ? "" : <i className="bi bi-dash text-muted opacity-50" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
                    if (isGraded) return sub.state === 'TURNED_IN' ? <i className="bi bi-check text-success fs-6" title="Inlämnad"></i> : "";
                    switch (sub.state) {
                        case 'TURNED_IN': return <i className="bi bi-check text-success fs-6" title="Inlämnad"></i>;
                        case 'RETURNED': return <i className="bi bi-check-all text-success fs-6" title="Klar"></i>;
                        case 'RECLAIMED_BY_STUDENT': return <i className="bi bi-arrow-counterclockwise text-warning" title="Återtaget"></i>;
                        default: return <i className="bi bi-dash text-muted opacity-75" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
                    }
                }}
                getGradeColorByPercent={getGradeColorByPercent}
                isStudentAtRisk={(sid, subs, gw) => isStudentAtRisk(sid, subs, gw)}
                showGraded={showGraded}
                showHeatmap={showHeatmap}
                maxSubmissionsPerGroup={maxSubmissionsPerGroup}
            />
        </div>
    );
};

export default MatrixView;
