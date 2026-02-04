import React, { useEffect, useState, useMemo } from 'react';
import { useTodoData } from '../hooks/useTodoData';
import { useTodoFiltering } from '../hooks/useTodoFiltering';

// Components
import LoadingSpinner from './common/LoadingSpinner';
import ErrorState from './common/ErrorState';
import EmptyState from './common/EmptyState';
import TodoToolbar from './todo/TodoToolbar';
import TodoSidebar from './todo/TodoSidebar';
import TodoDetails from './todo/TodoDetails';

const TodoView = ({ selectedCourseId, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
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

    // Data Hook
    const { data, loading, isRefreshing, error, refetch, fetchSingleCourseTodo } = useTodoData(selectedCourseId, refreshTrigger, onUpdate, onLoading);

    // Filtering Hook
    const { sortedAssignments, topicGroups, visibleAssignments } = useTodoFiltering(data, {
        selectedCourseId, filterText, assignmentFilter, hideEmptyAssignments, sortType, excludeFilters, excludeTopicFilters
    });

    // Selection Logic
    const selectedGroup = useMemo(() => selectedWorkKey 
        ? sortedAssignments.find(g => `${g.courseId}-${g.id}` === selectedWorkKey)
        : null, [selectedWorkKey, sortedAssignments]);

    // Auto-select first item
    useEffect(() => {
        if (!loading && sortedAssignments.length > 0) {
            const exists = sortedAssignments.some(g => `${g.courseId}-${g.id}` === selectedWorkKey);
            if (!selectedWorkKey || !exists) {
                const firstKey = `${sortedAssignments[0].courseId}-${sortedAssignments[0].id}`;
                setSelectedWorkKey(firstKey);
            }
        }
    }, [loading, sortedAssignments.length, selectedCourseId]);

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

    return (
        <div className={`container-fluid p-0 h-100 d-flex flex-column position-relative ${isRefreshing ? 'opacity-50' : ''}`} style={{transition: 'opacity 0.2s'}}>
            
            <TodoToolbar 
                sortType={sortType} setSortType={setSortType} 
                hideEmptyAssignments={hideEmptyAssignments} setHideEmptyAssignments={setHideEmptyAssignments}
                assignmentFilter={assignmentFilter} setAssignmentFilter={setAssignmentFilter}
                filterText={filterText} setFilterText={setFilterText}
            />

            <div className="d-flex flex-grow-1 overflow-hidden">
                {loading && data.length === 0 ? (
                    <LoadingSpinner />
                ) : error ? (
                    <ErrorState error={error} onRetry={refetch} />
                ) : sortedAssignments.length === 0 ? (
                    <EmptyState isRefreshing={isRefreshing} onRefresh={refetch} />
                ) : (
                    <>
                        <div className="col-md-4 col-lg-3 border-end bg-light overflow-auto h-100 shadow-sm" style={{zIndex: 2}}>
                            <TodoSidebar 
                                topicGroups={topicGroups}
                                selectedWorkKey={selectedWorkKey}
                                setSelectedWorkKey={setSelectedWorkKey}
                                totalCount={sortedAssignments.length}
                                selectedCourseId={selectedCourseId}
                                fetchSingleCourseTodo={fetchSingleCourseTodo}
                                isRefreshing={isRefreshing}
                            />
                        </div>

                        <div className="col-md-8 col-lg-9 bg-white overflow-auto h-100">
                            <TodoDetails selectedGroup={selectedGroup} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TodoView;