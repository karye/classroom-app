import React from 'react';
import { isSameDay, parseISO } from 'date-fns';

const EventCard = ({ positionedEvent, allAnnouncements, allCoursework = {}, allNotes, selectedEvent, onClick, todoCountsByCourse }) => {
    const { event, style } = positionedEvent;

    // Helper to extract metadata
    const getEventMetadata = (description) => {
        if (!description) return { group: null, staff: null };
        const groupMatch = description.match(/Grupp:\s*([^\n]+)/);
        return {
            group: groupMatch ? groupMatch[1].trim() : null
        };
    };

    // Helper for distinct Material Design colors
    const getCourseColor = (name) => {
        if (!name) return { bg: '#e8f0fe', text: '#1967d2', border: '#1967d2' }; // Default Blue
        const colors = [
            { bg: '#fce8e6', text: '#c5221f', border: '#c5221f' }, // Red 50
            { bg: '#e6f4ea', text: '#137333', border: '#137333' }, // Green 50
            { bg: '#e8f0fe', text: '#1967d2', border: '#1967d2' }, // Blue 50
            { bg: '#fef7e0', text: '#ea8600', border: '#ea8600' }, // Yellow 50
            { bg: '#f3e8fd', text: '#8e24aa', border: '#8e24aa' }, // Purple 50
            { bg: '#e0f2f1', text: '#00695c', border: '#00695c' }, // Teal 50
            { bg: '#fff0e1', text: '#e65100', border: '#e65100' }, // Orange 50
            { bg: '#fce4ec', text: '#c2185b', border: '#c2185b' }, // Pink 50
            { bg: '#f3e5f5', text: '#7b1fa2', border: '#7b1fa2' }, // Deep Purple 50
            { bg: '#e8eaf6', text: '#303f9f', border: '#303f9f' }, // Indigo 50
            { bg: '#e1f5fe', text: '#0288d1', border: '#0288d1' }, // Light Blue 50
            { bg: '#e0f7fa', text: '#0097a7', border: '#0097a7' }, // Cyan 50
            { bg: '#f1f8e9', text: '#689f38', border: '#689f38' }, // Light Green 50
            { bg: '#f9fbe7', text: '#afb42b', border: '#afb42b' }, // Lime 50
            { bg: '#fff9c4', text: '#fbc02d', border: '#fbc02d' }, // Yellow 100
            { bg: '#ffe0b2', text: '#f57c00', border: '#f57c00' }, // Orange 100
            { bg: '#ffccbc', text: '#e64a19', border: '#e64a19' }, // Deep Orange 50
            { bg: '#efebe9', text: '#5d4037', border: '#5d4037' }, // Brown 50
            { bg: '#fafafa', text: '#616161', border: '#616161' }, // Grey 50
            { bg: '#eceff1', text: '#455a64', border: '#455a64' }  // Blue Grey 50
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const { group } = getEventMetadata(event.description);
    const theme = getCourseColor(event.courseName || event.summary);
    const todoCount = todoCountsByCourse[event.courseName || event.summary] || 0;
    
    // Selection Logic
    const isSpecificallySelected = selectedEvent?.id === event.id;
    const isCourseSelected = selectedEvent?.courseName === (event.courseName || event.summary);

    // Calculate REAL-TIME announcement and note count from central state
    const eventDate = parseISO(event.start.dateTime || event.start.date);
    const courseAnnouncements = allAnnouncements[event.courseId] || [];
    
    // Find announcements for this day
    const dayAnnouncements = courseAnnouncements.filter(ann => {
        const annDate = parseISO(ann.scheduledTime || ann.updateTime);
        return isSameDay(annDate, eventDate);
    });

    const freshAnnouncementCount = dayAnnouncements.length;
    
    // Check if any of THESE announcements have notes in the central state
    const freshNoteCount = dayAnnouncements.filter(ann => allNotes[ann.id] && allNotes[ann.id].trim().length > 0).length;

    // Check for deadlines (Real-time)
    const courseWork = allCoursework[event.courseId] || [];
    const freshDeadlineCount = courseWork.filter(work => {
        if (!work.dueDate) return false;
        let due;
        if (typeof work.dueDate === 'string') {
            due = parseISO(work.dueDate);
        } else {
            due = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
        }
        return isSameDay(due, eventDate);
    }).length;

    // Use fresh count if available, fallback to backend count if central state for this course is empty
    const finalAnnouncementCount = (courseAnnouncements.length > 0) ? freshAnnouncementCount : (event.announcementCount || 0);
    const finalNoteCount = (courseAnnouncements.length > 0) ? freshNoteCount : (event.noteCount || 0);
    const finalDeadlineCount = (courseWork.length > 0) ? freshDeadlineCount : 0;

    const hasAnnouncements = finalAnnouncementCount > 0;
    const hasNotes = finalNoteCount > 0; 
    const hasDeadlines = finalDeadlineCount > 0;

    // Title logic: Use group name (second row) as primary, fallback to course name
    const displayTitle = group || event.courseName || event.summary;

    return (
        <div 
            className="position-absolute p-1 rounded border shadow-sm overflow-hidden event-card d-flex flex-column"
            style={{
                ...style,
                backgroundColor: theme.bg,
                borderColor: isSpecificallySelected ? '#000' : theme.border,
                borderLeftWidth: isSpecificallySelected ? '6px' : '4px',
                zIndex: isSpecificallySelected ? 15 : 10,
                cursor: 'pointer',
                boxShadow: isSpecificallySelected ? '0 0 10px rgba(0,0,0,0.2)' : (isCourseSelected ? '0 0 0 2px rgba(0,0,0,0.05)' : ''),
                transform: isSpecificallySelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.1s ease-in-out'
            }}
            onClick={(e) => onClick(event, e)}
            title={`${event.summary}\n${group ? `Grupp: ${group}` : ''}\n${event.location || ''}\n${hasAnnouncements ? `• ${finalAnnouncementCount} inlägg i flödet\n` : ''}${hasNotes ? `• ${finalNoteCount} loggboksanteckningar\n` : ''}${hasDeadlines ? `• ${finalDeadlineCount} uppgifter med deadline idag\n` : ''}(Klicka för att se uppgifter)`}
        >
            {/* Title (Bold) */}
            <div className="fw-bold text-truncate small lh-1 mb-1" style={{ color: theme.text, fontSize: '0.75rem' }}>
                {displayTitle}
            </div>
            
            {/* Location (Muted) */}
            {event.location && (
                <div className="text-truncate lh-1 mb-1" style={{ fontSize: '0.6rem', color: theme.text, opacity: 0.7 }}>
                    {event.location}
                </div>
            )}

            {/* Status Indicators Row (Bottom) */}
            <div className="d-flex align-items-center gap-2 mt-auto pb-0">
                {hasAnnouncements && (
                    <i className="bi bi-journal-text text-primary" style={{ fontSize: '0.65rem' }} title={`${finalAnnouncementCount} inlägg i flödet`}></i>
                )}
                {hasNotes && (
                    <i className="bi bi-journal-text text-warning" style={{ fontSize: '0.7rem' }} title={`${finalNoteCount} loggboksanteckningar`}></i>
                )}
                {hasDeadlines && (
                    <i className="bi bi-calendar-check text-danger" style={{ fontSize: '0.65rem' }} title={`${finalDeadlineCount} uppgifter med deadline idag`}></i>
                )}
                {todoCount > 0 && (
                    <span className="badge rounded-pill bg-danger border border-white border-1 px-1" style={{ fontSize: '0.55rem', minWidth: '16px' }} title={`${todoCount} inlämningar att rätta`}>
                        {todoCount}
                    </span>
                )}
            </div>
        </div>
    );
};

export default EventCard;
