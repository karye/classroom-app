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
import EmptyState from './common/EmptyState';

// Components
import TimeGrid from './schedule/TimeGrid';
import DayColumn from './schedule/DayColumn';
import DashboardSidebar from './schedule/DashboardSidebar';

// Helpers
const matchesFilterList = (text, filters) => {
    if (!filters || filters.length === 0 || !text) return false;
    const lowText = text.toLowerCase();
    return filters.some(f => lowText.includes(f.toLowerCase()));
};

const ScheduleView = ({ courses, refreshTrigger, onUpdate, onLoading, excludeFilters = [], excludeTopicFilters = [] }) => {
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
        const loadInitialData = async () => {
            setLocalLoading(true);
            try {
                // 1. Load Schedule from Cache for instant UI
                const scheduleCacheKey = `schedule_cache_global`;
                const cachedSchedule = await dbGet(scheduleCacheKey);
                if (cachedSchedule) {
                    setEvents(cachedSchedule.data);
                    if (onUpdate && cachedSchedule.timestamp) {
                         onUpdate(new Date(cachedSchedule.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                }

                // 2. ALWAYS fetch fresh Todos from local DB (via API) to ensure sync consistency
                if (courses.length > 0) {
                    await fetchTodos();
                }

            } catch (err) {
                console.warn("Initial data load failed", err);
            } finally {
                setLocalLoading(false);
            }
        };
        loadInitialData();
    }, [courses]);

    useEffect(() => {
        if (refreshTrigger > 0) {
            refreshAllData();
        }
    }, [refreshTrigger]);

    const refreshAllData = async () => {
        setLocalLoading(true);
        onLoading({ loading: true, message: 'Uppdaterar schema från Google Kalender...' });
        setError(null);
        try {
            // 1. Fetch Calendar Events (Deep sync with Google)
            const eventsData = await fetchEvents();
            
            // 2. Fetch Todos (Fast fetch from our local DB for all visible courses)
            await fetchTodos();

            const eventCount = eventsData?.length || 0;
            const msg = `Schema uppdaterat: ${eventCount} lektioner hämtade.`;

            const now = Date.now();
            if (onUpdate) onUpdate(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            
            onLoading({ loading: false, message: msg });
        } catch (err) {
            console.error("Calendar refresh failed", err);
            setError("Kunde inte uppdatera schemat.");
            onLoading({ loading: false, message: 'Synkning misslyckades.' });
        } finally {
            setLocalLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            // Only fetch events for visible courses, and force a refresh
            const courseIds = courses.map(c => c.id).join(',');
            const res = await axios.get(`/api/events?refresh=true`, { params: { courseIds } });
            setEvents(res.data);
            await dbSet(`schedule_cache_global`, {
                timestamp: Date.now(),
                data: res.data
            });
            return res.data;
        } catch (err) {
            console.error("Failed to fetch events", err);
            throw err;
        }
    };

    const fetchTodos = async () => {
        try {
            // Note: Global todos now read from DB, so we don't necessarily need ?refresh=true here
            // if we just synced events and course details. But for safety during "Global Sync", we add it.
            const courseIds = courses.map(c => c.id).join(',');
            const res = await axios.get('/api/todos', { params: { courseIds } });
            processRecentTodos(res.data);
            await dbSet('todo_cache_data', res.data);
            return res.data;
        } catch (err) {
            console.error("Failed to fetch todos for dashboard", err);
            throw err;
        }
    };

    const processRecentTodos = (data) => {
        if (!data || !Array.isArray(data)) return;
        
        console.log(`[DEBUG] Processing ${data.length} courses for dashboard todos`);

        const allPending = data.flatMap(course => {
            return (course.todos || [])
                .filter(t => t.state === 'TURNED_IN')
                .filter(t => {
                    // Apply global filters
                    if (matchesFilterList(t.workTitle, excludeFilters)) return false;
                    if (matchesFilterList(t.topicName, excludeTopicFilters)) return false;
                    return true;
                })
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
        return allPendingTodos; // Show all when no filter is active
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

    if (events.length === 0) return (
        <EmptyState 
            icon="bi-calendar-week"
            title="Inget att visa nu"
            message="Ingen schema-data hittades. Klicka på knappen för att hämta lektioner från Google Kalender."
            onRefresh={refreshAllData}
            isRefreshing={loading}
        />
    );

    return (
        <div className="container-fluid p-0 bg-white h-100 d-flex flex-column">
            {/* Header */}
            <div className="bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm z-10">
                <div className="d-flex align-items-center gap-3">
                    <h5 className="mb-0 fw-bold text-primary">
                        <i className="bi bi-calendar3 me-2"></i>
                        v.{getISOWeek(viewDate)} 
                        <span className="text-muted ms-2 fw-normal text-capitalize" style={{ fontSize: '0.9rem' }}>
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