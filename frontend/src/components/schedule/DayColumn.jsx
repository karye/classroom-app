import React from 'react';
import { format, isSameDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import { layoutEventsForDay, CONSTANTS } from '../../utils/calendarLayout';
import EventCard from './EventCard';

const DayColumn = ({ day, events, selectedCourseName, onEventClick, todoCountsByCourse }) => {
    const isToday = isSameDay(day, new Date());
    const positionedEvents = layoutEventsForDay(events);

    return (
        <div className="border-end d-flex flex-column" style={{ flex: '1 1 0', minWidth: '150px' }}>
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
            <div className="position-relative" style={{ height: `${CONSTANTS.TOTAL_HEIGHT}px`, backgroundColor: isToday ? 'rgba(13, 110, 253, 0.02)' : 'transparent' }}>
                {/* Grid Lines */}
                {CONSTANTS.HOURS.map((h, i) => (
                    <div key={h} className="border-bottom w-100 position-absolute" style={{ top: `${i * CONSTANTS.HOUR_HEIGHT}px`, borderBottomColor: '#f0f0f0' }}></div>
                ))}

                {/* Events */}
                {positionedEvents.map((item) => (
                    <EventCard 
                        key={item.event.id}
                        positionedEvent={item}
                        selectedCourseName={selectedCourseName}
                        onClick={onEventClick}
                        todoCountsByCourse={todoCountsByCourse}
                    />
                ))}

                {/* Current Time Indicator */}
                {isToday && (() => {
                    const now = new Date();
                    const currentHour = now.getHours() + now.getMinutes() / 60;
                    if (currentHour >= CONSTANTS.START_HOUR && currentHour <= CONSTANTS.END_HOUR) {
                        const top = (currentHour - CONSTANTS.START_HOUR) * CONSTANTS.HOUR_HEIGHT;
                        return <div className="position-absolute w-100 border-top border-danger" style={{ top: `${top}px`, zIndex: 20, borderWidth: '2px' }}>
                            <div className="bg-danger rounded-circle position-absolute" style={{ width: '8px', height: '8px', top: '-5px', left: '-4px' }}></div>
                        </div>;
                    }
                })()}
            </div>
        </div>
    );
};

export default DayColumn;
