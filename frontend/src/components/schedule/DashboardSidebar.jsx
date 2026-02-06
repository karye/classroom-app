import React, { useMemo, useState } from 'react';
import { formatDistanceToNow, parseISO, isSameDay, format } from 'date-fns';
import { sv } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

const DashboardSidebar = ({ recentTodos, selectedEvent, allAnnouncements, allCoursework = {}, allNotes, onClearFilter }) => {
    const [collapsedCourses, setCollapsedCourses] = useState(new Set());
    const [sectionsCollapsed, setSectionsCollapsed] = useState({
        todos: false,
        notes: false,
        deadlines: false
    });
    const selectedCourseName = selectedEvent?.courseName || null;

    const toggleSection = (section) => {
        setSectionsCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Helper to extract metadata (matching EventCard)
    const getEventMetadata = (description) => {
        if (!description) return { group: null };
        const groupMatch = description.match(/Grupp:\s*([^\n]+)/);
        return {
            group: groupMatch ? groupMatch[1].trim() : null
        };
    };

    // Helper for distinct Material Design colors (matching EventCard)
    const getCourseColor = (name) => {
        if (!name) return { bg: '#e8f0fe', text: '#1967d2', border: '#1967d2' };
        const colors = [
            { bg: '#fce8e6', text: '#c5221f', border: '#c5221f' }, { bg: '#e6f4ea', text: '#137333', border: '#137333' },
            { bg: '#e8f0fe', text: '#1967d2', border: '#1967d2' }, { bg: '#fef7e0', text: '#ea8600', border: '#ea8600' },
            { bg: '#f3e8fd', text: '#8e24aa', border: '#8e24aa' }, { bg: '#e0f2f1', text: '#00695c', border: '#00695c' },
            { bg: '#fff0e1', text: '#e65100', border: '#e65100' }, { bg: '#fce4ec', text: '#c2185b', border: '#c2185b' },
            { bg: '#f3e5f5', text: '#7b1fa2', border: '#7b1fa2' }, { bg: '#e8eaf6', text: '#303f9f', border: '#303f9f' },
            { bg: '#e1f5fe', text: '#0288d1', border: '#0288d1' }, { bg: '#e0f7fa', text: '#0097a7', border: '#0097a7' },
            { bg: '#f1f8e9', text: '#689f38', border: '#689f38' }, { bg: '#f9fbe7', text: '#afb42b', border: '#afb42b' },
            { bg: '#fff9c4', text: '#fbc02d', border: '#fbc02d' }, { bg: '#ffe0b2', text: '#f57c00', border: '#f57c00' },
            { bg: '#ffccbc', text: '#e64a19', border: '#e64a19' }, { bg: '#efebe9', text: '#5d4037', border: '#5d4037' },
            { bg: '#fafafa', text: '#616161', border: '#616161' }, { bg: '#eceff1', text: '#455a64', border: '#455a64' }
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const courseTheme = useMemo(() => getCourseColor(selectedCourseName), [selectedCourseName]);
    const { group } = getEventMetadata(selectedEvent?.description);
    const displayTitle = group || selectedEvent?.courseName || selectedEvent?.summary;

    // Time formatting
    const eventTimeStr = useMemo(() => {
        if (!selectedEvent) return "";
        const start = parseISO(selectedEvent.start.dateTime || selectedEvent.start.date);
        const end = parseISO(selectedEvent.end.dateTime || selectedEvent.end.date);
        
        const dayName = format(start, 'eeee d MMM', { locale: sv });
        const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const startTime = format(start, 'HH:mm');
        const endTime = format(end, 'HH:mm');
        
        return `${capitalizedDay} · ${startTime}–${endTime}`;
    }, [selectedEvent]);

    // Lesson Log Matching
    const lessonLog = useMemo(() => {
        if (!selectedEvent) return [];
        const eventDate = parseISO(selectedEvent.start.dateTime || selectedEvent.start.date);
        const courseAnns = allAnnouncements[selectedEvent.courseId] || [];
        
        return courseAnns.filter(ann => {
            const annDate = parseISO(ann.scheduledTime || ann.updateTime);
            return isSameDay(annDate, eventDate);
        }).map(ann => ({
            ...ann,
            privateNote: allNotes[ann.id]
        }));
    }, [selectedEvent, allAnnouncements, allNotes]);

    // Deadlines Matching
    const deadlines = useMemo(() => {
        if (!selectedEvent) return [];
        const eventDate = parseISO(selectedEvent.start.dateTime || selectedEvent.start.date);
        const courseWork = allCoursework[selectedEvent.courseId] || [];
        
        return courseWork.filter(work => {
            if (!work.dueDate) return false;
            
            let due;
            if (typeof work.dueDate === 'string') {
                due = parseISO(work.dueDate);
            } else {
                // Fallback if it's still the Google API object format
                due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
            }
            return isSameDay(due, eventDate);
        });
    }, [selectedEvent, allCoursework]);

    const toggleCourse = (courseName) => {
        const newCollapsed = new Set(collapsedCourses);
        if (newCollapsed.has(courseName)) {
            newCollapsed.delete(courseName);
        } else {
            newCollapsed.add(courseName);
        }
        setCollapsedCourses(newCollapsed);
    };

    // Hierarchical Grouping: Course -> Topic -> Assignment
    const groupedData = useMemo(() => {
        const courses = {};
        
        recentTodos.forEach(todo => {
            const cName = todo.courseName;
            const tName = todo.topicName || 'Övrigt';
            const wId = todo.workId;

            if (!courses[cName]) {
                courses[cName] = { name: cName, topics: {}, totalSubmissions: 0 };
            }
            
            if (!courses[cName].topics[tName]) {
                courses[cName].topics[tName] = { name: tName, assignments: {} };
            }
            
            if (!courses[cName].topics[tName].assignments[wId]) {
                courses[cName].topics[tName].assignments[wId] = {
                    id: wId,
                    title: todo.workTitle,
                    submissions: []
                };
            }
            courses[cName].topics[tName].assignments[wId].submissions.push(todo);
            courses[cName].totalSubmissions++;
        });
        
        // Convert objects to sorted arrays
        return Object.values(courses)
            .map(c => ({
                ...c,
                topics: Object.values(c.topics)
                    .map(t => ({
                        ...t,
                        assignments: Object.values(t.assignments)
                            .sort((a, b) => b.submissions.length - a.submissions.length)
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    }, [recentTodos]);

    return (
        <div className="border-start bg-light overflow-auto custom-scrollbar d-flex flex-column shadow-sm" style={{ width: '350px', flexShrink: 0 }}>
            {/* Header */}
            <div className="p-3 bg-light border-bottom sticky-top z-10">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="text-muted fw-bold small mb-0">
                        {selectedEvent ? 'Lektionsdetaljer' : 'Att rätta'}
                    </h6>
                    {!selectedEvent && <span className="badge bg-danger rounded-pill">{recentTodos.length}</span>}
                    {selectedEvent && <button className="btn btn-close btn-sm" onClick={onClearFilter} style={{padding: '0.2rem'}}></button>}
                </div>
                
                {selectedEvent && (
                    <div className="d-flex flex-column gap-2">
                        <div className="d-flex align-items-center">
                            <span className="badge rounded-pill border-0 px-3 py-2 fw-bold" style={{ backgroundColor: courseTheme.bg, color: courseTheme.text, fontSize: '0.8rem', whiteSpace: 'normal', textAlign: 'left', lineHeight: '1.2' }}>
                                <i className="bi bi-mortarboard-fill me-2"></i>
                                {displayTitle}
                            </span>
                        </div>
                        <div className="text-muted small ps-1 fw-bold">
                            <i className="bi bi-clock me-2"></i>
                            {eventTimeStr}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-0 flex-grow-1 overflow-auto bg-light">
                
                {/* ATT RÄTTA SECTION */}
                <div 
                    className="px-3 py-2 fw-bold text-secondary border-bottom bg-white bg-opacity-50 d-flex justify-content-between align-items-center cursor-pointer" 
                    style={{fontSize: '0.7rem', letterSpacing: '0.02rem', cursor: 'pointer'}}
                    onClick={() => toggleSection('todos')}
                >
                    <span>
                        <i className="bi bi-check2-square me-2 text-danger"></i>
                        {selectedEvent ? 'Att rätta i kursen' : 'Allt att rätta'}
                    </span>
                    <i className={`bi bi-chevron-${sectionsCollapsed.todos ? 'right' : 'down'} opacity-50`}></i>
                </div>

                {!sectionsCollapsed.todos && (
                    recentTodos.length > 0 ? (
                        groupedData.map(course => {
                            const isCollapsed = collapsedCourses.has(course.name);
                            const theme = getCourseColor(course.name);

                            return (
                                <div key={course.name} className="border-bottom">
                                    {/* Course Header */}
                                    <div 
                                        className="px-3 py-2 d-flex justify-content-between align-items-center cursor-pointer bg-white bg-opacity-25" 
                                        style={{fontSize: '0.75rem', cursor: 'pointer', borderLeft: `4px solid ${theme.border}`}}
                                        onClick={() => toggleCourse(course.name)}
                                    >
                                        <div className="d-flex align-items-center text-truncate">
                                            <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'down'} me-2 opacity-50`}></i>
                                            <span className="fw-bold text-dark">{course.name}</span>
                                        </div>
                                        <span className="badge rounded-pill" style={{backgroundColor: theme.bg, color: theme.text, fontSize: '0.65rem'}}>
                                            {course.totalSubmissions} st
                                        </span>
                                    </div>

                                    {!isCollapsed && course.topics.map(topic => (
                                        <div key={topic.name} className="ps-3">
                                            {/* Topic Header */}
                                            <div className="px-3 py-1 small fw-bold text-muted border-bottom" style={{fontSize: '0.65rem', backgroundColor: 'rgba(0,0,0,0.02)'}}>
                                                {topic.name}
                                            </div>
                                            
                                            <div className="p-2 d-flex flex-column gap-2">
                                                {topic.assignments.map(assign => (
                                                    <div key={assign.id} className="card border-0 shadow-sm p-2 bg-white ms-2">
                                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                                            <div className="fw-normal text-dark small text-truncate pe-2" title={assign.title} style={{ lineHeight: '1.2' }}>
                                                                {assign.title}
                                                            </div>
                                                            <span className="badge bg-light text-dark border rounded-pill flex-shrink-0" style={{fontSize: '0.6rem'}}>
                                                                {assign.submissions.length}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Student Chips */}
                                                        <div className="d-flex flex-wrap gap-1 mt-1">
                                                            {assign.submissions.map((sub, sIdx) => {
                                                                const nameParts = (sub.studentName || 'Elev').trim().split(/\s+/);
                                                                const displayName = nameParts.length > 1 
                                                                    ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}` 
                                                                    : nameParts[0];
                                                                
                                                                return (
                                                                    <div key={`${sub.studentId}-${assign.id}-${sIdx}`} 
                                                                        className={`d-flex align-items-center rounded-pill px-2 py-0 border ${sub.late ? 'bg-danger-subtle border-danger text-danger' : 'bg-white border-light-subtle text-muted'}`} 
                                                                        style={{fontSize: '0.65rem', height: '18px'}}
                                                                        title={`${sub.studentName}${sub.late ? ' (SEN)' : ''}`}>
                                                                        <span className="text-truncate" style={{maxWidth: '85px'}}>{displayName}</span>
                                                                        {!!sub.late && <i className="bi bi-clock-fill ms-1" style={{fontSize: '0.55rem'}}></i>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center text-muted small bg-white bg-opacity-50">
                            Inga inlämningar väntar på rättning just nu.
                        </div>
                    )
                )}

                {/* ANTECKNINGAR SECTION */}
                {selectedEvent && (
                    <div className="border-top">
                        <div 
                            className="px-3 py-2 fw-bold text-secondary border-bottom d-flex align-items-center justify-content-between bg-white bg-opacity-50 cursor-pointer" 
                            style={{fontSize: '0.7rem', letterSpacing: '0.02rem', cursor: 'pointer'}}
                            onClick={() => toggleSection('notes')}
                        >
                            <span><i className="bi bi-journal-text me-2 text-primary"></i>Anteckningar</span>
                            <i className={`bi bi-chevron-${sectionsCollapsed.notes ? 'right' : 'down'} opacity-50`}></i>
                        </div>
                        
                        {!sectionsCollapsed.notes && (
                            lessonLog.length > 0 ? (
                                <div className="p-3 d-flex flex-column gap-3">
                                    {lessonLog.map(log => (
                                        <div key={log.id} className="bg-white rounded border-start border-3 border-primary p-3 shadow-sm">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 fw-normal" style={{fontSize: '0.6rem'}}>Classroom</span>
                                                {log.state === 'DRAFT' && <span className="badge bg-warning bg-opacity-25 text-dark border-0 fw-normal" style={{fontSize: '0.6rem'}}>Schemalagd</span>}
                                            </div>
                                            <div className="small text-dark mb-2 lesson-log-text lh-base">
                                                <ReactMarkdown>{log.text}</ReactMarkdown>
                                            </div>

                                            {/* Materials / Documents Pills */}
                                            {log.materials && log.materials.length > 0 && (
                                                <div className="d-flex flex-wrap gap-1 mt-2 mb-1">
                                                    {log.materials.map((m, idx) => {
                                                        const type = Object.keys(m)[0]; // driveFile, youtubeVideo, link, form
                                                        const data = m[type];
                                                        const title = data.title || data.url || "Bilaga";
                                                        const icon = type === 'driveFile' ? 'bi-file-earmark-text' : 
                                                                    type === 'youtubeVideo' ? 'bi-youtube' : 
                                                                    type === 'link' ? 'bi-link-45deg' : 'bi-paperclip';
                                                        
                                                        return (
                                                            <a key={idx} href={data.alternateLink || data.url} target="_blank" rel="noreferrer" 
                                                            className="badge bg-light text-dark border d-flex align-items-center gap-1 text-decoration-none py-1 px-2"
                                                            style={{fontSize: '0.6rem', fontWeight: 'normal'}}>
                                                                <i className={`bi ${icon}`}></i>
                                                                <span className="text-truncate" style={{maxWidth: '120px'}}>{title}</span>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {log.privateNote && (
                                                <div className="mt-3 p-2 bg-warning bg-opacity-10 border-start border-3 border-warning rounded-end">
                                                    <h6 className="fw-bold text-warning mb-1" style={{fontSize: '0.65rem', letterSpacing: '0.01rem'}}>Mina anteckningar</h6>
                                                    <div className="small text-muted markdown-preview">
                                                        <ReactMarkdown>{log.privateNote}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-muted small border-bottom bg-white bg-opacity-50">
                                    Inga anteckningar för denna lektion.
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* DEADLINES SECTION */}
                {selectedEvent && (
                    <div className="border-top">
                        <div 
                            className="px-3 py-2 fw-bold text-secondary border-bottom d-flex align-items-center justify-content-between bg-white bg-opacity-50 cursor-pointer" 
                            style={{fontSize: '0.7rem', letterSpacing: '0.02rem', cursor: 'pointer'}}
                            onClick={() => toggleSection('deadlines')}
                        >
                            <div className="d-flex align-items-center">
                                <i className="bi bi-calendar-check me-2 text-danger"></i>
                                <span>Uppgifter (deadline idag)</span>
                                {deadlines.length > 0 && <span className="badge bg-danger bg-opacity-75 rounded-pill ms-2" style={{fontSize: '0.65rem'}}>{deadlines.length}</span>}
                            </div>
                            <i className={`bi bi-chevron-${sectionsCollapsed.deadlines ? 'right' : 'down'} opacity-50`}></i>
                        </div>
                        
                        {!sectionsCollapsed.deadlines && (
                            deadlines.length > 0 ? (
                                <div className="p-3 d-flex flex-column gap-2">
                                    {deadlines.map(work => (
                                        <div key={work.id} className="card border-0 shadow-sm p-3 bg-white">
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <div className="fw-bold text-dark small lh-sm">
                                                    {work.title}
                                                </div>
                                                <span className="badge bg-light text-dark border rounded-pill flex-shrink-0 ms-2" style={{fontSize: '0.6rem'}}>
                                                    {work.maxPoints ? `${work.maxPoints} p` : 'Inga poäng'}
                                                </span>
                                            </div>
                                            <div className="text-muted" style={{fontSize: '0.65rem'}}>
                                                <i className="bi bi-tag me-1"></i>
                                                {work.topicName || 'Inget ämne'}
                                            </div>
                                            <a href={work.alternateLink} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-light text-primary border-0 p-0 mt-2 text-start d-inline-block" style={{fontSize: '0.65rem'}}>
                                                Visa i Classroom <i className="bi bi-arrow-right"></i>
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-muted small bg-white bg-opacity-50">
                                    Inga deadlines för denna lektion.
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardSidebar;