import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { dbGet, dbSet } from '../db';

// Components
import LoadingSpinner from './common/LoadingSpinner';
import ErrorState from './common/ErrorState';
import EmptyState from './common/EmptyState';
import TodoToolbar from './todo/TodoToolbar';
import TodoSidebar from './todo/TodoSidebar';
import TodoDetails from './todo/TodoDetails';

const TodoView = ({ selectedCourseId, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedWorkKey, setSelectedWorkKey] = useState(localStorage.getItem('todo_last_selected_work')); 
    const [sortType, setSortType] = useState('date-desc'); 
    const [hideEmptyAssignments, setHideEmptyAssignments] = useState(localStorage.getItem('todo_hide_empty') === 'true');
    const [filterText, setFilterText] = useState('');

    // Helper to check if a string matches any filter
    const matchesFilterList = (text, filters) => {
        if (!filters || filters.length === 0 || !text) return false;
        const lowText = text.toLowerCase();
        return filters.some(f => lowText.includes(f.toLowerCase()));
    };

    const setLocalLoading = (val, background = false) => {
        if (!background) setLoading(val);
        else setIsRefreshing(val);
        if (onLoading) onLoading(val);
    };

    // Load initial data from IndexedDB
    useEffect(() => {
        const loadCache = async () => {
            setLocalLoading(true);
            try {
                const cached = await dbGet('todo_cache_data');
                if (cached) {
                    setData(cached);
                    const savedTime = await dbGet('todo_cache_timestamp');
                    if (savedTime && onUpdate) onUpdate(savedTime);
                }
            } catch (err) {
                console.warn("Could not load Todo cache from IndexedDB", err);
            } finally {
                setLocalLoading(false);
            }
        };
        loadCache();
    }, []);

    useEffect(() => {
        localStorage.setItem('todo_hide_empty', hideEmptyAssignments);
    }, [hideEmptyAssignments]);

    // Only fetch on manual trigger
    useEffect(() => {
        if (refreshTrigger > 0) {
            if (selectedCourseId) {
                fetchSingleCourseTodo(selectedCourseId);
            } else {
                fetchTodos(true);
            }
        }
    }, [refreshTrigger]);

    const fetchTodos = async (isBackground = false) => {
        setLocalLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/todos');
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            setData(res.data);
            
            await dbSet('todo_cache_data', res.data);
            await dbSet('todo_cache_timestamp', now);
            
            if (onUpdate) onUpdate(now);
        } catch (err) {
            console.error("Failed to fetch todos", err);
            setError("Kunde inte hämta att-göra-listan.");
        } finally {
            setLocalLoading(false, isBackground);
        }
    };

    const fetchSingleCourseTodo = async (courseId) => {
        if (!courseId) return;
        setIsRefreshing(true);
        try {
            const res = await axios.get(`/api/courses/${courseId}/todos`);
            const newData = res.data; // Object or null

            // Update state: replace the course data in the array
            setData(prevData => {
                const existingIndex = prevData.findIndex(c => c.courseId === courseId);
                let nextData = [...prevData];
                
                if (newData) {
                    if (existingIndex >= 0) {
                        nextData[existingIndex] = newData;
                    } else {
                        nextData.push(newData);
                    }
                } else {
                    if (existingIndex >= 0) nextData.splice(existingIndex, 1);
                }
                
                // Update cache
                dbSet('todo_cache_data', nextData);
                return nextData;
            });

            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (onUpdate) onUpdate(now);

        } catch (err) {
            console.error("Failed to update single course", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    // --- DATA PROCESSING ---
    
    const filteredData = selectedCourseId 
        ? data.filter(c => c.courseId === selectedCourseId) 
        : data;

    // 1. Extract all unique assignments
    const allAssignments = filteredData.flatMap(course => {
        const groups = {};
        course.todos.forEach(todo => {
            // Apply exclude filters (Assignment & Topic)
            if (matchesFilterList(todo.workTitle, excludeFilters)) return;
            if (matchesFilterList(todo.topicName, excludeTopicFilters)) return;

            if (!groups[todo.workId]) {
                groups[todo.workId] = {
                    id: todo.workId,
                    title: todo.workTitle,
                    courseId: course.courseId,
                    courseName: course.courseName,
                    topicId: todo.topicId || 'none',
                    topicName: todo.topicName || 'Övrigt',
                    studentCount: course.studentCount,
                    latestUpdate: 0,
                    pending: [],
                    done: [],
                    other: []
                };
            }
            
            // Categorize
            if (todo.state === 'TURNED_IN') {
                groups[todo.workId].pending.push(todo);
                if (todo.updateTime) {
                    const time = new Date(todo.updateTime).getTime();
                    if (time > groups[todo.workId].latestUpdate) {
                        groups[todo.workId].latestUpdate = time;
                    }
                }
            } else if (todo.state === 'RETURNED' || (typeof todo.assignedGrade !== 'undefined' && todo.assignedGrade !== null)) {
                groups[todo.workId].done.push(todo);
            } else {
                groups[todo.workId].other.push(todo);
            }
        });
        return Object.values(groups);
    });

    // 2. Filter and Sort
    const sortedAssignments = allAssignments
        .filter(a => {
            if (hideEmptyAssignments && a.pending.length === 0) return false;
            if (filterText && !a.title.toLowerCase().includes(filterText.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortType === 'name-asc') return a.title.localeCompare(b.title, 'sv');
            if (sortType === 'date-desc') return (b.latestUpdate || 0) - (a.latestUpdate || 0);
            if (sortType === 'date-asc') return (a.latestUpdate || 0) - (b.latestUpdate || 0);
            return 0;
        });

    // 3. Group sorted assignments into topics
    const topicGroups = [];
    const topicsMap = {};

    sortedAssignments.forEach(assign => {
        const tKey = `${assign.courseId}-${assign.topicId}`;
        if (!topicsMap[tKey]) {
            topicsMap[tKey] = {
                id: tKey,
                name: assign.topicName,
                courseName: assign.courseName,
                assignments: []
            };
            topicGroups.push(topicsMap[tKey]);
        }
        topicsMap[tKey].assignments.push(assign);
    });

    const selectedGroup = selectedWorkKey 
        ? sortedAssignments.find(g => `${g.courseId}-${g.id}` === selectedWorkKey)
        : null;

    // 4. Flat list for keyboard navigation
    const visibleAssignments = topicGroups.flatMap(t => t.assignments);

    // --- HOOKS ---

    // Effect to auto-select first assignment
    useEffect(() => {
        if (!loading && sortedAssignments.length > 0) {
            const exists = sortedAssignments.some(g => `${g.courseId}-${g.id}` === selectedWorkKey);
            if (!selectedWorkKey || !exists) {
                const firstKey = `${sortedAssignments[0].courseId}-${sortedAssignments[0].id}`;
                setSelectedWorkKey(firstKey);
                localStorage.setItem('todo_last_selected_work', firstKey);
            }
        }
    }, [loading, sortedAssignments.length, selectedCourseId]);

    // Persist selection
    useEffect(() => {
        if (selectedWorkKey) {
            localStorage.setItem('todo_last_selected_work', selectedWorkKey);
        }
    }, [selectedWorkKey]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (visibleAssignments.length === 0) return;
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

            e.preventDefault();
            const currentIndex = visibleAssignments.findIndex(g => `${g.courseId}-${g.id}` === selectedWorkKey);
            let nextIndex;

            if (currentIndex === -1) {
                nextIndex = 0;
            } else if (e.key === 'ArrowDown') {
                nextIndex = currentIndex < visibleAssignments.length - 1 ? currentIndex + 1 : 0;
            } else {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleAssignments.length - 1;
            }

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

    // --- RENDERING ---

    return (
        <div className={`container-fluid p-0 h-100 d-flex flex-column position-relative ${isRefreshing ? 'opacity-50' : ''}`} style={{transition: 'opacity 0.2s'}}>
            
            <TodoToolbar 
                sortType={sortType} 
                setSortType={setSortType} 
                hideEmptyAssignments={hideEmptyAssignments} 
                setHideEmptyAssignments={setHideEmptyAssignments}
                filterText={filterText}
                setFilterText={setFilterText}
            />

            <div className="d-flex flex-grow-1 overflow-hidden">
                {loading && data.length === 0 ? (
                    <LoadingSpinner />
                ) : error ? (
                    <ErrorState error={error} onRetry={() => fetchTodos()} />
                ) : sortedAssignments.length === 0 ? (
                    <EmptyState isRefreshing={isRefreshing} onRefresh={() => fetchTodos()} />
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
