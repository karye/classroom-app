import { parseISO } from 'date-fns';

const START_HOUR = 8;
const END_HOUR = 18; 
const HOUR_HEIGHT = 60; 

export const getEventStyle = (event) => {
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
export const layoutEventsForDay = (dayEvents) => {
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

export const CONSTANTS = {
    START_HOUR,
    END_HOUR,
    HOUR_HEIGHT,
    TOTAL_HEIGHT: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
    HOURS: Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)
};
