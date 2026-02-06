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
