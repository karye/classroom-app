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
import EmptyState from './common/EmptyState';
import ExportPreviewModal from './common/ExportPreviewModal';
import StudentSummary from './matrix/StudentSummary';
import MatrixTable from './matrix/MatrixTable';
import MatrixToolbar from './matrix/MatrixToolbar';

const MatrixView = ({ 
    courseId, 
    courseName, 
    currentCourseData: details, 
    onSync, 
    loading, 
    excludeFilters = [], 
    excludeTopicFilters = [] 
}) => {
    // UI State
    const [filterText, setFilterText] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState('all'); 
    const [hideNoDeadline, setHideNoDeadline] = useState(localStorage.getItem('matrix_hide_nodeadline') === 'true');
    const [showHeatmap, setShowHeatmap] = useState(localStorage.getItem('matrix_show_heatmap') !== 'false');
    const [sortType, setSortType] = useState('name-asc');
    const [expandedTopics, setExpandedTopics] = useState({});
    const [selectedStudent, setSelectedStudent] = useState(null);
    
    // Export State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportData, setExportData] = useState({ content: '', filename: '' });

    // Persistence
    useEffect(() => { localStorage.setItem('matrix_show_heatmap', showHeatmap); }, [showHeatmap]);
    useEffect(() => { localStorage.setItem('matrix_hide_nodeadline', hideNoDeadline); }, [hideNoDeadline]);

    // Derived Data (Filtering, Grouping, Sorting)
    const { groupedWork, maxSubmissionsPerGroup } = useMemo(() => {
        console.log("--- Matrix Data Processing ---");
        console.log("Raw details:", details);
        const result = processMatrixData(details, { filterText, assignmentFilter, hideNoDeadline, excludeFilters, excludeTopicFilters });
        console.log("Processed groupedWork:", result.groupedWork);
        return result;
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
    const showGraded = assignmentFilter === 'all' || assignmentFilter.startsWith('cat-');
    const selectedStudentData = details?.students.find(s => s.userId === selectedStudent);

    const onExportClick = () => {
        const csv = handleGenerateCSV(courseName, groupedWork, details.students, details.submissions, showGraded);
        setExportData({ content: csv, filename: `${courseName}_matrix.csv` });
        setShowExportModal(true);
    };

    // Check if we have actual data to show
    const hasData = details && details.students?.length > 0;

    if (!hasData) return (
        <EmptyState 
            icon="bi-grid-3x3-gap"
            title="Inget att visa nu"
            message={`Ingen data hittades för ${courseName || 'denna kurs'}. Klicka på knappen för att hämta elever och resultat från Google Classroom.`}
            onRefresh={onSync}
            isRefreshing={loading}
        />
    );

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
                    const categoryLower = (cw?.categoryName || '').toLowerCase();
                    const isProv = categoryLower === 'prov';
                    const hasGrade = typeof sub?.assignedGrade !== 'undefined' && sub?.assignedGrade !== null;

                    // Only show numerical grade if it's a 'Prov'
                    if (isProv && hasGrade) return <span className="fw-bold">{sub.assignedGrade}</span>;
                    
                    // If it's NOT a prov but has a grade, show 'Klar' icon
                    if (!isProv && hasGrade) return <i className="bi bi-check-all text-success fs-6" title="Klar"></i>;

                    if (!sub) return isProv ? "" : <i className="bi bi-dash text-muted opacity-50" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
                    
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