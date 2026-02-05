import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useTodoData, transformDetailsToTodo } from '../hooks/useTodoData';
import { useTodoFiltering } from '../hooks/useTodoFiltering';

// Components
import LoadingSpinner from './common/LoadingSpinner';
import ErrorState from './common/ErrorState';
import EmptyState from './common/EmptyState';
import TodoToolbar from './todo/TodoToolbar';
import TodoSidebar from './todo/TodoSidebar';
import TodoDetails from './todo/TodoDetails';

const TodoView = ({ 
    courses = [], 
    selectedCourseId, 
    currentCourseData,
    onSync,
    loading: courseLoading,
    refreshTrigger, 
    onUpdate, 
    onLoading, 
    excludeFilters = [], 
    excludeTopicFilters = [] 
}) => {
    // UI State
    const [selectedWorkKey, setSelectedWorkKey] = useState(localStorage.getItem('todo_last_selected_work')); 
    const [sortType, setSortType] = useState('date-desc'); 
    const [hideEmptyAssignments, setHideEmptyAssignments] = useState(localStorage.getItem('todo_hide_empty') === 'true');
    const [assignmentFilter, setAssignmentFilter] = useState(localStorage.getItem('todo_assignment_filter') || 'all'); 
    const [filterText, setFilterText] = useState('');

    // Persistence
    useEffect(() => { localStorage.setItem('todo_hide_empty', hideEmptyAssignments); }, [hideEmptyAssignments]);
    useEffect(() => { localStorage.setItem('todo_assignment_filter', assignmentFilter); }, [assignmentFilter]);
    useEffect(() => { if (selectedWorkKey) localStorage.setItem('todo_last_selected_work', selectedWorkKey); }, [selectedWorkKey]);

    // Data Hook (Aggregated Todos)
    const { data: aggregatedData, loading: aggregatedLoading, isRefreshing, error, refetch, syncCourse } = useTodoData(selectedCourseId, refreshTrigger, onUpdate, onLoading);

    // --- EFFECTIVE DATA LOGIC ---
    const effectiveData = useMemo(() => {
        console.log("--- Todo Data Source Analysis ---");
        console.log("Selected Course ID:", selectedCourseId);
        
        if (selectedCourseId) {
            // Priority 1: Use central truth if it has data
            if (currentCourseData && currentCourseData.submissions?.length > 0) {
                console.log("[Todo] Using Central Source (currentCourseData)");
                const transformed = transformDetailsToTodo(selectedCourseId, currentCourseData);
                return transformed ? [transformed] : [];
            }
            // Priority 2: Use aggregated list if central truth is empty/not loaded yet
            const fromAggregated = aggregatedData.find(c => c.courseId === selectedCourseId);
            if (fromAggregated) {
                console.log("[Todo] Using Aggregated Source");
                return [fromAggregated];
            }
            console.log("[Todo] No data found for selected course.");
            return [];
        }
        
        console.log("[Todo] Using ALL aggregated classrooms");
        return aggregatedData;
    }, [selectedCourseId, currentCourseData, aggregatedData]);

    // Filtering Hook
    const { sortedAssignments, topicGroups, visibleAssignments } = useTodoFiltering(effectiveData, {
        selectedCourseId, filterText, assignmentFilter, hideEmptyAssignments, sortType, excludeFilters, excludeTopicFilters
    });

    console.log("--- Todo Render Analysis ---");
    console.log("Topic Groups count:", topicGroups.length);
    console.log("Sorted Assignments count:", sortedAssignments.length);

    // Get current course name for display
    const selectedCourseName = useMemo(() => {
        if (!selectedCourseId) return null;
        const course = courses.find(c => c.id === selectedCourseId);
        return course ? course.name : null;
    }, [selectedCourseId, courses]);

    // Selection Logic
    const selectedGroup = useMemo(() => selectedWorkKey 
        ? sortedAssignments.find(g => `${g.courseId}-${g.id}` === selectedWorkKey)
        : null, [selectedWorkKey, sortedAssignments]);

    // Handlers
    const handleWorkSelection = (courseId, workId) => {
        setSelectedWorkKey(`${courseId}-${workId}`);
    };

    const handleManualRefresh = () => {
        if (selectedCourseId) {
            onSync();
        } else {
            alert("För att uppdatera alla kurser samtidigt, gå till Schema-vyn och klicka på 'Uppdatera'.");
        }
    };

    // Auto-select first item
    useEffect(() => {
        if (!aggregatedLoading && sortedAssignments.length > 0) {
            const exists = sortedAssignments.some(g => `${g.courseId}-${g.id}` === selectedWorkKey);
            if (!selectedWorkKey || !exists) {
                const firstKey = `${sortedAssignments[0].courseId}-${sortedAssignments[0].id}`;
                setSelectedWorkKey(firstKey);
            }
        }
    }, [aggregatedLoading, sortedAssignments.length, selectedWorkKey]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (visibleAssignments.length === 0) return;
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

            e.preventDefault();
            const currentIndex = visibleAssignments.findIndex(g => `${g.courseId}-${g.id}` === selectedWorkKey);
            let nextIndex;

            if (currentIndex === -1) nextIndex = 0;
            else if (e.key === 'ArrowDown') nextIndex = currentIndex < visibleAssignments.length - 1 ? currentIndex + 1 : 0;
            else nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleAssignments.length - 1;

            const nextGroup = visibleAssignments[nextIndex];
            const nextKey = `${nextGroup.courseId}-${nextGroup.id}`;
            setSelectedWorkKey(nextKey);

            setTimeout(() => {
                const el = document.getElementById(`assign-${nextKey}`);
                if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 0);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedWorkKey, visibleAssignments]);

    // --- RENDER LOGIC ---

    if (error) return <ErrorState error={error} onRetry={refetch} />;

    // Logic to determine if we should show EmptyState
    const hasAnyDataForSelection = effectiveData.some(c => c.todos?.length > 0);

    // Case 1: NO DATA AT ALL for the current selection (Needs sync)
    if (!hasAnyDataForSelection) {
        return (
            <EmptyState 
                icon="bi-cloud-download"
                title="Inget att visa nu"
                message={`Ingen data hittades för ${selectedCourseName || 'dina klassrum'}. Klicka på knappen för att hämta inlämningar från Google Classroom.`}
                isRefreshing={aggregatedLoading || isRefreshing || courseLoading} 
                onRefresh={handleManualRefresh} 
            />
        );
    }

    // Case 2: DATA EXISTS (Show UI frame)
    return (
        <div className="d-flex h-100 bg-white">
            <TodoSidebar 
                topicGroups={topicGroups}
                selectedWorkKey={selectedWorkKey}
                onSelectWork={handleWorkSelection}
                totalCount={visibleAssignments.length}
            />
            
            <div className="d-flex flex-grow-1 overflow-hidden">
                <div className="flex-grow-1 d-flex flex-column bg-light border-start overflow-hidden">
                    <TodoToolbar 
                        filterText={filterText} setFilterText={setFilterText}
                        assignmentFilter={assignmentFilter} setAssignmentFilter={setAssignmentFilter}
                        hideEmptyAssignments={hideEmptyAssignments} setHideEmptyAssignments={setHideEmptyAssignments}
                        sortType={sortType} setSortType={setSortType}
                        count={visibleAssignments.length}
                    />
                    
                    <div className="flex-grow-1 overflow-auto">
                        {sortedAssignments.length === 0 ? (
                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted animate-fade-in">
                                <div className="bg-white rounded-circle p-4 mb-3 shadow-sm">
                                    <i className="bi bi-funnel fs-1 opacity-25"></i>
                                </div>
                                <h5>Filter aktiverat</h5>
                                <p className="small">Dina nuvarande filter döljer alla uppgifter i denna vy.</p>
                                <button className="btn btn-primary btn-sm rounded-pill px-4 fw-bold" onClick={() => {
                                    setHideEmptyAssignments(false);
                                    setAssignmentFilter('all');
                                    setFilterText('');
                                }}>Visa allt</button>
                            </div>
                        ) : selectedGroup ? (
                            <TodoDetails 
                                assignment={selectedGroup} 
                                onRefresh={() => refetch()}
                            />
                        ) : (
                            <div className="h-100 d-flex align-items-center justify-content-center text-muted">
                                <div className="text-center">
                                    <i className="bi bi-arrow-left-circle fs-1 mb-2 opacity-25 d-block"></i>
                                    Välj en uppgift i listan till vänster
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TodoView;