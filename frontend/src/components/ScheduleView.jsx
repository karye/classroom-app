import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    format,
    parseISO,
    isSameDay,
    getISOWeek,
    startOfISOWeek,
    endOfISOWeek,
    eachDayOfInterval,
    subWeeks,
    addWeeks
} from 'date-fns';
import { sv } from 'date-fns/locale';
import { dbGet, dbSet } from '../db';
import LoadingSpinner from './common/LoadingSpinner';

// Components
import TimeGrid from './schedule/TimeGrid';
import DayColumn from './schedule/DayColumn';
import DashboardSidebar from './schedule/DashboardSidebar';

const ScheduleView = ({ courses, refreshTrigger, onUpdate, onLoading }) => {
    const [events, setEvents] = useState([]);
    const [allPendingTodos, setAllPendingTodos] = useState([]); 
    const [selectedCourseName, setSelectedCourseName] = useState(null); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewDate, setViewDate] = useState(new Date()); 

    const setLocalLoading = (val) => {
        setLoading(val);
        if (onLoading) onLoading(val);
    };

    const weekStart = startOfISOWeek(viewDate);
    const weekEnd = endOfISOWeek(viewDate);
    
    // Filter out Saturday (6) and Sunday (0)
    const daysInWeek = useMemo(() => {
        return eachDayOfInterval({ start: weekStart, end: weekEnd })
            .filter(day => day.getDay() !== 6 && day.getDay() !== 0);
    }, [weekStart, weekEnd]);

    useEffect(() => {
        const loadCache = async () => {
            setLocalLoading(true);
            try {
                // Load Schedule
                const scheduleCacheKey = `schedule_cache_global`;
                const cachedSchedule = await dbGet(scheduleCacheKey);
                if (cachedSchedule) {
                    setEvents(cachedSchedule.data);
                    if (onUpdate && cachedSchedule.timestamp) {
                         onUpdate(new Date(cachedSchedule.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                } else {
                    await fetchEvents();
                }

                // Load Todos for Dashboard
                const todoCache = await dbGet('todo_cache_data');
                if (todoCache) {
                    processRecentTodos(todoCache);
                } else {
                    fetchTodos();
                }

            } catch (err) {
                console.warn("Cache load failed", err);
                await fetchEvents();
            } finally {
                setLocalLoading(false);
            }
        };
        loadCache();
    }, [courses]);

    useEffect(() => {
        if (refreshTrigger > 0) {
            refreshAllData();
        }
    }, [refreshTrigger]);

    const refreshAllData = async () => {
        setLocalLoading(true);
        setError(null);
        try {
            await Promise.all([fetchEvents(), fetchTodos()]);
            const now = Date.now();
            if (onUpdate) onUpdate(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (err) {
            console.error("Global refresh failed", err);
            setError("Kunde inte uppdatera all data.");
        } finally {
            setLocalLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            // Only fetch events for visible courses
            const courseIds = courses.map(c => c.id).join(',');
            const res = await axios.get(`/api/events`, { params: { courseIds } });
            setEvents(res.data);
            await dbSet(`schedule_cache_global`, {
                timestamp: Date.now(),
                data: res.data
            });
        } catch (err) {
            console.error("Failed to fetch events", err);
            throw err;
        }
    };

    const fetchTodos = async () => {
        try {
            const courseIds = courses.map(c => c.id).join(',');
            const res = await axios.get('/api/todos', { params: { courseIds } });
            processRecentTodos(res.data);
            await dbSet('todo_cache_data', res.data);
        } catch (err) {
            console.error("Failed to fetch todos for dashboard", err);
            throw err;
        }
    };

    const processRecentTodos = (data) => {
        if (!data) return;
        const visibleCourseIds = new Set(courses.map(c => c.id));

        const allPending = data.flatMap(course => {
            if (!visibleCourseIds.has(course.courseId)) return [];
            return course.todos
                .filter(t => t.state === 'TURNED_IN')
                .map(t => ({...t, courseName: course.courseName}));
        });
        
        allPending.sort((a, b) => {
            const timeA = a.updateTime ? new Date(a.updateTime).getTime() : 0;
            const timeB = b.updateTime ? new Date(b.updateTime).getTime() : 0;
            return timeB - timeA;
        });

        setAllPendingTodos(allPending);
    };

    // Filter todos based on selection
    const displayedTodos = useMemo(() => {
        if (selectedCourseName) {
            return allPendingTodos.filter(t => t.courseName === selectedCourseName);
        }
        return allPendingTodos.slice(0, 5); // Default top 5
    }, [allPendingTodos, selectedCourseName]);

    // Pre-calculate counts per course for the calendar badges
    const todoCountsByCourse = useMemo(() => {
        const counts = {};
        allPendingTodos.forEach(t => {
            counts[t.courseName] = (counts[t.courseName] || 0) + 1;
        });
        return counts;
    }, [allPendingTodos]);

    const getEventsForDay = (day) => {
        return events.filter(event => {
            const start = event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date);
            return isSameDay(start, day);
        }).sort((a, b) => {
            const startA = a.start.dateTime ? parseISO(a.start.dateTime).getTime() : 0;
            const startB = b.start.dateTime ? parseISO(b.start.dateTime).getTime() : 0;
            return startA - startB;
        });
    };

    const navigateWeek = (direction) => {
        if (direction === 'prev') setViewDate(subWeeks(viewDate, 1));
        else if (direction === 'next') setViewDate(addWeeks(viewDate, 1));
        else setViewDate(new Date());
    };

    const handleEventClick = (event, e) => {
        e.stopPropagation();
        const name = event.courseName || event.summary;
        
        console.log("--- Kalenderhändelse klickad ---");
        console.log("Titel:", event.summary);
        console.log("Matchad kurs:", event.courseName);
        
        setSelectedCourseName(name);
    };

    if (loading && events.length === 0) return <LoadingSpinner />;

    return (
        <div className="container-fluid p-0 bg-white h-100 d-flex flex-column">
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm z-10">
                <div className="d-flex align-items-center gap-3">
                    <h5 className="mb-0 fw-bold text-primary">
                        <i className="bi bi-calendar3 me-2"></i>
                        v.{getISOWeek(viewDate)} 
                        <span className="text-muted ms-2 fw-normal" style={{ fontSize: '0.9rem' }}>
                            {format(weekStart, 'd MMM', { locale: sv })} - {format(weekEnd, 'd MMM yyyy', { locale: sv })}
                        </span>
                    </h5>
                    <div className="btn-group shadow-sm ms-2">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigateWeek('prev')} title="Föregående vecka"><i className="bi bi-chevron-left"></i></button>
                        <button className="btn btn-outline-secondary btn-sm px-3 fw-bold" onClick={() => navigateWeek('today')}>Idag</button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigateWeek('next')} title="Nästa vecka"><i className="bi bi-chevron-right"></i></button>
                    </div>
                </div>
                {error && <span className="text-danger small"><i className="bi bi-exclamation-triangle me-1"></i>{error}</span>}
            </div>

            {/* Content Area with Sidebar */}
            <div className="flex-grow-1 d-flex overflow-hidden">
                
                {/* Main Calendar Area */}
                <div className="flex-grow-1 overflow-auto position-relative custom-scrollbar">
                    <div className="d-flex" style={{ minWidth: '800px' }}>
                        
                        <TimeGrid />

                        {/* Days Columns */}
                        <div className="flex-grow-1 d-flex">
                            {daysInWeek.map((day, dayIdx) => (
                                <DayColumn 
                                    key={dayIdx}
                                    day={day}
                                    events={getEventsForDay(day)}
                                    selectedCourseName={selectedCourseName}
                                    onEventClick={handleEventClick}
                                    todoCountsByCourse={todoCountsByCourse}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DashboardSidebar 
                    recentTodos={displayedTodos} 
                    selectedCourseName={selectedCourseName}
                    onClearFilter={() => setSelectedCourseName(null)}
                />

            </div>
        </div>
    );
};

export default ScheduleView;