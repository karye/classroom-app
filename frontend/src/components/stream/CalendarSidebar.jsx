import React from 'react';
import { DayPicker } from 'react-day-picker';
import { sv } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

const CalendarSidebar = ({ selectedDate, setSelectedDate, daysWithPosts }) => {
    return (
        <div className="col-md-3 col-lg-3 border-end bg-light p-3 h-100 d-none d-md-block overflow-auto" style={{ minWidth: '380px', width: '380px' }}>
            <style>
                {`
                    .rdp-month_caption { text-transform: capitalize; }
                    .rdp-weekday { text-transform: capitalize; }
                `}
            </style>
            <div className="bg-white rounded shadow-sm p-2 mb-3 d-flex justify-content-center" style={{ fontSize: '0.8rem' }}>
                <div style={{ maxWidth: '100%' }}>
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        modifiers={{ has_post: daysWithPosts }}
                        modifiersClassNames={{ has_post: 'rdp-day_has_post position-relative' }}
                        locale={sv}
                        weekStartsOn={1}
                        showOutsideDays
                        showWeekNumber
                    />
                </div>
            </div>
            {selectedDate && (
                <button className="btn btn-outline-secondary w-100 btn-sm mb-3" onClick={() => setSelectedDate(undefined)} title="Rensa datumfilter">
                    <i className="bi bi-x-circle me-2"></i>Visa alla inlägg
                </button>
            )}
            <div className="text-muted small px-2">
                <p className="mb-1"><i className="bi bi-info-circle me-1"></i>Blå prick = inlägg finns.</p>
                <p className="mb-0"><i className="bi bi-calendar-event me-1"></i>Veckonummer visas till vänster.</p>
            </div>
        </div>
    );
};

export default CalendarSidebar;
