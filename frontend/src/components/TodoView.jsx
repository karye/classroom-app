import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { dbGet, dbSet } from '../db';

const TodoView = ({ selectedCourseId, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedWorkKey, setSelectedWorkKey] = useState(localStorage.getItem('todo_last_selected_work')); // Small keys like this can stay in localStorage
    const [sortType, setSortType] = useState('date-desc'); // 'name-asc', 'date-desc', 'date-asc'

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

    // Only fetch on manual trigger
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchTodos(true);
        }
    }, [refreshTrigger]);

    const fetchTodos = async (isBackground = false) => {
        setLocalLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/todos');
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            setData(res.data);
            
            // Save to IndexedDB (no quota issues)
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

    // --- DATA PROCESSING (Always before Hooks that use these values) ---
    
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
                    latestUpdate: 0, // Initialize to 0, will be updated by pending items
                    pending: [],
                    done: [],
                    other: []
                };
            }
            
            // Categorize
            if (todo.state === 'TURNED_IN') {
                groups[todo.workId].pending.push(todo);
                // Update latestUpdate ONLY for pending items to keep the focus on new work
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

    // 2. Filter assignments to only show those with at least one PENDING item (to keep it a TODO list)
    // and Sort assignments globally before grouping by topic
    const sortedAssignments = allAssignments
        .filter(a => a.pending.length > 0)
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

    // --- HOOKS (Using the processed data) ---

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
    }, [loading, sortedAssignments.length]);

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

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <i className="bi bi-arrow-clockwise spin text-primary" style={{ fontSize: '3rem' }}></i>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-danger">
                <i className="bi bi-exclamation-triangle me-2"></i>{error}
                <button className="btn btn-link btn-sm" onClick={() => fetchTodos()}>Försök igen</button>
            </div>
        );
    }

    if (sortedAssignments.length === 0) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                {isRefreshing ? <div className="spinner-border text-secondary mb-3" role="status"></div> : <i className="bi bi-check2-circle fs-1 opacity-25 mb-2"></i>}
                <p>Inga uppgifter att rätta!</p>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchTodos()}>Uppdatera</button>
            </div>
        );
    }

    return (
        <div className={`container-fluid p-0 h-100 d-flex flex-column position-relative ${isRefreshing ? 'opacity-50' : ''}`} style={{transition: 'opacity 0.2s'}}>
            <div className="d-flex flex-grow-1 overflow-hidden">
                {/* Left Sidebar: Assignments Grouped by Topic */}
                <div className="col-md-4 col-lg-3 border-end bg-light overflow-auto h-100 shadow-sm" style={{zIndex: 2}}>
                    <div className="sticky-top bg-light border-bottom p-2 d-flex justify-content-between align-items-center">
                        <span className="text-muted fw-bold" style={{fontSize: '0.7rem'}}>UPPGIFTER ({sortedAssignments.length})</span>
                        <div className="btn-group btn-group-sm">
                            <button className={`btn btn-link p-1 ${sortType === 'name-asc' ? 'text-primary' : 'text-muted'}`} onClick={() => setSortType('name-asc')} title="A-Ö"><i className="bi bi-sort-alpha-down"></i></button>
                            <button className={`btn btn-link p-1 ${sortType === 'date-desc' ? 'text-primary' : 'text-muted'}`} onClick={() => setSortType('date-desc')} title="Nyast först"><i className="bi bi-sort-numeric-down-alt"></i></button>
                            <button className={`btn btn-link p-1 ${sortType === 'date-asc' ? 'text-primary' : 'text-muted'}`} onClick={() => setSortType('date-asc')} title="Äldst först"><i className="bi bi-sort-numeric-up"></i></button>
                        </div>
                    </div>
                    
                    {topicGroups.map(topic => (
                        <div key={topic.id} className="mb-0">
                            <div className="bg-white px-2 py-1 small fw-bold text-primary border-bottom border-top mt-0" style={{fontSize: '0.65rem', backgroundColor: '#f8f9fa !important'}}>
                                <i className="bi bi-collection me-1"></i>{topic.name.toUpperCase()}
                                {!selectedCourseId && <span className="float-end opacity-50 fw-normal" style={{fontSize: '0.6rem'}}>{topic.courseName}</span>}
                            </div>
                            <div className="list-group list-group-flush">
                                {topic.assignments.map(group => {
                                    const key = `${group.courseId}-${group.id}`;
                                    const isActive = selectedWorkKey === key;
                                    return (
                                        <button
                                            key={key}
                                            id={`assign-${key}`}
                                            onClick={() => setSelectedWorkKey(isActive ? null : key)}
                                            className={`list-group-item list-group-item-action border-bottom py-1 ps-3 pe-2 ${isActive ? 'active shadow-sm' : ''}`}
                                            style={{ transition: 'all 0.1s' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="overflow-hidden pe-2">
                                                    <div className={`text-truncate ${isActive ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.75rem', lineHeight: '1.2' }} title={group.title}>
                                                        {group.title}
                                                    </div>
                                                </div>
                                                <span className={`badge rounded-pill flex-shrink-0 ${isActive ? 'bg-white text-primary' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                                                    {group.pending.length}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Content: Students */}
                <div className="col-md-8 col-lg-9 bg-white overflow-auto h-100">
                    {selectedGroup ? (
                        <div className="h-100 d-flex flex-column">
                            <div className="bg-white border-bottom p-2 d-flex justify-content-between align-items-center shadow-sm flex-shrink-0">
                                <div className="overflow-hidden">
                                    <h6 className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>{selectedGroup.title}</h6>
                                    <div className="text-muted" style={{fontSize: '0.75rem'}}>
                                        {selectedGroup.courseName} 
                                        <span className="mx-2 opacity-50">•</span> 
                                        <span className="fw-bold text-primary">{selectedGroup.pending.length} att rätta</span> av {selectedGroup.studentCount} elever
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-grow-1 overflow-auto">
                                {/* RENDERING UTILITY */}
                                {(() => {
                                    const renderTable = (list, title, colorClass, emptyMsg) => {
                                        if (list.length === 0 && !emptyMsg) return null;
                                        return (
                                            <div className="mb-4">
                                                <div className={`bg-light px-3 py-1 border-bottom d-flex justify-content-between align-items-center ${colorClass}`} style={{fontSize: '0.7rem', fontWeight: 'bold'}}>
                                                    <span>{title.toUpperCase()} ({list.length})</span>
                                                </div>
                                                {list.length > 0 ? (
                                                    <table className="table table-hover table-sm mb-0 w-100">
                                                        <tbody style={{fontSize: '0.8rem'}}>
                                                            {[...list].sort((a, b) => {
                                                                if (a.state === 'TURNED_IN') {
                                                                    const timeA = a.updateTime ? new Date(a.updateTime).getTime() : 0;
                                                                    const timeB = b.updateTime ? new Date(b.updateTime).getTime() : 0;
                                                                    return timeB - timeA;
                                                                }
                                                                return a.studentName.localeCompare(b.studentName, 'sv');
                                                            }).map((todo, index) => (
                                                                <tr key={todo.id} className="align-middle border-bottom">
                                                                    <td className="ps-3 py-1">
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span className="text-muted small" style={{ minWidth: '20px' }}>{index + 1}.</span>
                                                                            {todo.studentPhoto ? (
                                                                                <img src={todo.studentPhoto} alt="" className="rounded-circle border" style={{ width: '24px', height: '24px' }} />
                                                                            ) : (
                                                                                <div className="bg-light rounded-circle border d-flex align-items-center justify-content-center text-muted" style={{ width: '24px', height: '24px' }}>
                                                                                    <i className="bi bi-person" style={{fontSize: '0.8rem'}}></i>
                                                                                </div>
                                                                            )}
                                                                            <span className={`fw-bold text-truncate ${todo.state === 'CREATED' || todo.state === 'NEW' ? 'text-muted' : 'text-dark'}`} style={{maxWidth: '180px'}}>{todo.studentName}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1">
                                                                        {todo.state === 'TURNED_IN' && (
                                                                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 fw-normal px-1 py-0" style={{fontSize: '0.65rem'}}>
                                                                                <i className="bi bi-check2 me-1"></i>Inlämnad
                                                                            </span>
                                                                        )}
                                                                        {todo.state === 'RETURNED' && (
                                                                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 fw-normal px-1 py-0" style={{fontSize: '0.65rem'}}>
                                                                                <i className="bi bi-check-all me-1"></i>Klar
                                                                            </span>
                                                                        )}
                                                                        {(todo.state === 'CREATED' || todo.state === 'NEW') && (
                                                                            <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 fw-normal px-1 py-0" style={{fontSize: '0.65rem'}}>
                                                                                <i className="bi bi-dash me-1"></i>Ej inlämnad
                                                                            </span>
                                                                        )}
                                                                        {todo.late && todo.state === 'TURNED_IN' && (
                                                                            <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 fw-normal ms-1 px-1 py-0" style={{fontSize: '0.65rem'}}>
                                                                                <i className="bi bi-clock-history me-1"></i>Sen
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-end py-1 text-muted pe-3" style={{fontSize: '0.75rem'}}>
                                                                        {todo.state === 'TURNED_IN' && todo.updateTime ? format(parseISO(todo.updateTime), "d MMM HH:mm", { locale: sv }) : ''}
                                                                        {todo.state === 'RETURNED' && typeof todo.assignedGrade !== 'undefined' && todo.assignedGrade !== null && (
                                                                            <span className="fw-bold text-primary">Betyg: {todo.assignedGrade}</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="text-center py-1">
                                                                        <a href={todo.submissionLink} target="_blank" rel="noreferrer" className="text-primary opacity-75 hover-opacity-100" title="Öppna inlämning">
                                                                            <i className="bi bi-box-arrow-up-right" style={{fontSize: '0.8rem'}}></i>
                                                                        </a>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-3 text-muted small fst-italic">{emptyMsg}</div>
                                                )}
                                            </div>
                                        );
                                    };

                                    return (
                                        <>
                                            {renderTable(selectedGroup.pending, "Att rätta", "text-danger bg-danger bg-opacity-10")}
                                            {renderTable(selectedGroup.done, "Klara", "text-success bg-success bg-opacity-10")}
                                            {renderTable(selectedGroup.other, "Ej inlämnade", "text-muted")}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted opacity-50 p-5">
                            <i className="bi bi-arrow-left-circle fs-1 mb-3"></i>
                            <h4 className="fw-light">Välj en uppgift</h4>
                            <p className="small">Använd piltangenterna eller klicka till vänster.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TodoView;