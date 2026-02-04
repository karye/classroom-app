import React from 'react';
import { CONSTANTS } from '../../utils/calendarLayout';

const TimeGrid = () => {
    return (
        <div className="flex-shrink-0 bg-light border-end text-muted small text-end pt-5" style={{ width: '50px', position: 'sticky', left: 0, zIndex: 5 }}>
            <div style={{ height: '30px' }}></div>
            {CONSTANTS.HOURS.map(hour => (
                <div key={hour} style={{ height: `${CONSTANTS.HOUR_HEIGHT}px`, transform: 'translateY(-10px)', paddingRight: '5px' }}>
                    {hour}:00
                </div>
            ))}
        </div>
    );
};

export default TimeGrid;
