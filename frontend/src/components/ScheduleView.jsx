import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    format,
    parseISO,
    isSameDay,
    getISOWeek,
    addDays,
    startOfISOWeek,
    endOfISOWeek,
    eachDayOfInterval,
    isSameMonth,
    subWeeks,
    addWeeks,
    startOfDay
} from 'date-fns';
import { sv } from 'date-fns/locale';
import { dbGet, dbSet } from '../db';
import LoadingSpinner from './common/LoadingSpinner';

const ScheduleView = ({ refreshTrigger, onUpdate, onLoading }) => {
    const [events, setEvents] = useState([]);
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
                const cacheKey = `schedule_cache_global`;
                const cached = await dbGet(cacheKey);
                if (cached) {
                    setEvents(cached.data);
                    if (onUpdate && cached.timestamp) {
                         onUpdate(new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                } else {
                    await fetchEvents();
                }
            } catch (err) {
                console.warn("Schedule cache load failed", err);
                await fetchEvents();
            } finally {
                setLocalLoading(false);
            }
        };
        loadCache();
    }, []);

    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchEvents(true);
        }
    }, [refreshTrigger]);

    const fetchEvents = async (force = false) => {
        if (force) setLocalLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/api/events`);
            const now = Date.now();
            setEvents(res.data);
            
            if (onUpdate) onUpdate(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            await dbSet(`schedule_cache_global`, {
                timestamp: now,
                data: res.data
            });
        } catch (err) {
            console.error("Failed to fetch events", err);
            setError("Kunde inte hämta kalenderhändelser.");
        } finally {
            if (force) setLocalLoading(false);
        }
    };

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

    // Helper to extract metadata
    const getEventMetadata = (description) => {
        if (!description) return { group: null, staff: null };
        const groupMatch = description.match(/Grupp:\s*([^\n]+)/);
        const staffMatch = description.match(/Personal:\s*([^\n]+)/);
        return {
            group: groupMatch ? groupMatch[1].trim() : null,
            staff: staffMatch ? staffMatch[1].trim() : null
        };
    };

    // Helper for distinct Material Design colors
    const getCourseColor = (name) => {
        if (!name) return { bg: '#e8f0fe', text: '#1967d2', border: '#1967d2' }; // Default Blue
        
        const colors = [
            { bg: '#fce8e6', text: '#c5221f', border: '#c5221f' }, // Red
            { bg: '#fef7e0', text: '#ea8600', border: '#ea8600' }, // Yellow
            { bg: '#e6f4ea', text: '#137333', border: '#137333' }, // Green
            { bg: '#e8f0fe', text: '#1967d2', border: '#1967d2' }, // Blue
            { bg: '#f3e8fd', text: '#8e24aa', border: '#8e24aa' }, // Purple
            { bg: '#e0f2f1', text: '#00695c', border: '#00695c' }, // Teal
            { bg: '#fff8e1', text: '#f9a825', border: '#f9a825' }, // Amber
            { bg: '#eceff1', text: '#546e7a', border: '#546e7a' }  // Blue Grey
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const navigateWeek = (direction) => {
        if (direction === 'prev') setViewDate(subWeeks(viewDate, 1));
        else if (direction === 'next') setViewDate(addWeeks(viewDate, 1));
        else setViewDate(new Date());
    };

    // --- Time Grid Constants ---
    const START_HOUR = 8;
    const END_HOUR = 18; 
    const HOUR_HEIGHT = 60; 
    const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    const getEventStyle = (event) => {
        if (!event.start.dateTime || !event.end.dateTime) return {};

        const start = parseISO(event.start.dateTime);
        const end = parseISO(event.end.dateTime);

        let startHour = start.getHours() + start.getMinutes() / 60;
        let endHour = end.getHours() + end.getMinutes() / 60;

        if (startHour < START_HOUR) startHour = START_HOUR;
        if (endHour > END_HOUR) endHour = END_HOUR;
        
        const top = (startHour - START_HOUR) * HOUR_HEIGHT;
        const height = (endHour - startHour) * HOUR_HEIGHT;

        return {
            top: `${top}px`,
            height: `${Math.max(height, 25)}px`,
            zIndex: 10
        };
    };

    // Layout algorithm for overlapping events with clustering
    const layoutEventsForDay = (dayEvents) => {
        if (dayEvents.length === 0) return [];
        
        const items = dayEvents.map(event => ({
            event,
            start: parseISO(event.start.dateTime).getTime(),
            end: parseISO(event.end.dateTime).getTime(),
            width: 100,
            left: 0,
            colIndex: 0
        }));

        const clusters = [];
        let currentCluster = [];

        items.sort((a, b) => a.start - b.start);

        items.forEach(item => {
            if (currentCluster.length === 0) {
                currentCluster.push(item);
            } else {
                const clusterEnd = Math.max(...currentCluster.map(i => i.end));
                if (item.start < clusterEnd) {
                    currentCluster.push(item);
                } else {
                    clusters.push(currentCluster);
                    currentCluster = [item];
                }
            }
        });
        if (currentCluster.length > 0) clusters.push(currentCluster);

        clusters.forEach(cluster => {
            const columns = [];
            cluster.forEach(item => {
                let placed = false;
                for (let i = 0; i < columns.length; i++) {
                    const col = columns[i];
                    const overlap = col.some(prev => item.start < prev.end && item.end > prev.start);
                    if (!overlap) {
                        col.push(item);
                        item.colIndex = i;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    columns.push([item]);
                    item.colIndex = columns.length - 1;
                }
            });

            const totalCols = columns.length;
            cluster.forEach(item => {
                item.width = 100 / totalCols;
                item.left = (item.colIndex / totalCols) * 100;
            });
        });

        return items.map(item => {
            const baseStyle = getEventStyle(item.event);
            return {
                event: item.event,
                style: {
                    ...baseStyle,
                    left: `${item.left}%`,
                    width: `${item.width}%`,
                    right: 'auto',
                    borderLeftWidth: '4px'
                }
            };
        });
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

            {/* Scrollable Grid Area */}
            <div className="flex-grow-1 overflow-auto position-relative custom-scrollbar">
                <div className="d-flex" style={{ minWidth: '800px' }}>
                    
                    {/* Time Axis (Left Sidebar) */}
                    <div className="flex-shrink-0 bg-light border-end text-muted small text-end pt-5" style={{ width: '50px', position: 'sticky', left: 0, zIndex: 5 }}>
                        <div style={{ height: '30px' }}></div>
                        {hours.map(hour => (
                            <div key={hour} style={{ height: `${HOUR_HEIGHT}px`, transform: 'translateY(-10px)', paddingRight: '5px' }}>
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    <div className="flex-grow-1 d-flex">
                        {daysInWeek.map((day, dayIdx) => {
                            const isToday = isSameDay(day, new Date());
                            const dayEvents = getEventsForDay(day);
                            const positionedEvents = layoutEventsForDay(dayEvents);

                            return (
                                <div key={dayIdx} className="border-end d-flex flex-column" style={{ flex: '1 1 0', minWidth: '150px' }}>
                                    
                                    {/* Column Header */}
                                    <div className={`text-center py-2 border-bottom sticky-top ${isToday ? 'bg-primary text-white' : 'bg-white'}`} style={{ zIndex: 4, height: '50px' }}>
                                        <div className="text-uppercase small fw-bold opacity-75 lh-1" style={{ fontSize: '0.7rem' }}>
                                            {format(day, 'EEE', { locale: sv })}
                                        </div>
                                        <div className="fw-bold fs-5 lh-1">
                                            {format(day, 'd')}
                                        </div>
                                    </div>

                                    {/* Time Slots Background */}
                                    <div className="position-relative" style={{ height: `${TOTAL_HEIGHT}px`, backgroundColor: isToday ? 'rgba(13, 110, 253, 0.02)' : 'transparent' }}>
                                        {/* Grid Lines */}
                                        {hours.map((h, i) => (
                                            <div key={h} className="border-bottom w-100 position-absolute" style={{ top: `${i * HOUR_HEIGHT}px`, borderBottomColor: '#f0f0f0' }}></div>
                                        ))}

                                                                                {/* Events */}
                                                                                {positionedEvents.map(({ event, style }) => {
                                                                                    const { group } = getEventMetadata(event.description);
                                                                                    const theme = getCourseColor(event.courseName || event.summary);
                                                                                    
                                                                                    return (
                                                                                        <div 
                                                                                            key={event.id} 
                                                                                            className="position-absolute p-1 rounded border shadow-sm overflow-hidden"
                                                                                            style={{ 
                                                                                                ...style,
                                                                                                backgroundColor: theme.bg,
                                                                                                borderColor: theme.border,
                                                                                                borderLeftWidth: '4px',
                                                                                                zIndex: 10
                                                                                            }}
                                                                                            title={`${event.summary}\n${group ? `Grupp: ${group}` : ''}\n${event.location || ''}`}
                                                                                        >
                                                                                            {/* Title (Bold) */}
                                                                                            <div className="fw-bold text-truncate small lh-1 mb-1" style={{ color: theme.text }}>
                                                                                                {event.summary}
                                                                                            </div>
                                                                                            
                                                                                            {/* Group (Colored) */}
                                                                                            {group && (
                                                                                                <div className="text-truncate fw-bold lh-1 mb-1" style={{ fontSize: '0.65rem', color: theme.text, opacity: 0.8 }}>
                                                                                                    {group}
                                                                                                </div>
                                                                                            )}
                                                                                            
                                                                                            {/* Location (Muted) */}
                                                                                            {event.location && (
                                                                                                <div className="text-truncate lh-1" style={{ fontSize: '0.6rem', color: theme.text, opacity: 0.7 }}>
                                                                                                    {event.location}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}                                        
                                        {/* Current Time Indicator */}
                                        {isToday && (() => {
                                            const now = new Date();
                                            const currentHour = now.getHours() + now.getMinutes() / 60;
                                            if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
                                                const top = (currentHour - START_HOUR) * HOUR_HEIGHT;
                                                return <div className="position-absolute w-100 border-top border-danger" style={{ top: `${top}px`, zIndex: 20, borderWidth: '2px' }}>
                                                    <div className="bg-danger rounded-circle position-absolute" style={{ width: '8px', height: '8px', top: '-5px', left: '-4px' }}></div>
                                                </div>;
                                            }
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleView;
