import React from 'react';

const EventCard = ({ positionedEvent, selectedCourseName, onClick, todoCountsByCourse }) => {
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

    const { group } = getEventMetadata(event.description);
    const theme = getCourseColor(event.courseName || event.summary);
    const todoCount = todoCountsByCourse[event.courseName || event.summary] || 0;
    const isSelected = selectedCourseName === (event.courseName || event.summary);

    return (
        <div 
            className="position-absolute p-1 rounded border shadow-sm overflow-hidden event-card"
            style={{
                ...style,
                backgroundColor: theme.bg,
                borderColor: isSelected ? 'black' : theme.border,
                borderLeftWidth: '4px',
                zIndex: 10,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.1)' : ''
            }}
            onClick={(e) => onClick(event, e)}
            title={`${event.summary}\n${group ? `Grupp: ${group}` : ''}\n${event.location || ''}\n(Klicka för att se uppgifter)`}
        >
            {/* Todo Badge */}
            {todoCount > 0 && (
                <div className="position-absolute top-0 end-0 m-1">
                    <span className="badge rounded-pill bg-danger shadow-sm" style={{ fontSize: '0.65rem' }}>
                        {todoCount}
                    </span>
                </div>
            )}

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
};

export default EventCard;
