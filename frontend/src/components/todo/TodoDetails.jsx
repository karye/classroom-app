import React, { useEffect } from 'react';
import TodoTable from './TodoTable';

const TodoDetails = ({ selectedGroup }) => {
    useEffect(() => {
        if (selectedGroup) {
            console.log(`%c[Google Classroom] Uppgift: ${selectedGroup.title}`, 'color: #1a73e8; font-weight: bold; font-size: 1.2em;');
            
            const allStudents = [...selectedGroup.pending, ...selectedGroup.done, ...selectedGroup.other];
            
            console.group('Tolkning per elev (Matchat mot Classroom-status)');
            const formattedTable = allStudents.map(s => {
                let googleStatus = 'Tilldelad'; // Default (CREATED/NEW)
                if (s.state === 'TURNED_IN') googleStatus = 'Inlämnad';
                if (s.state === 'RETURNED') googleStatus = 'Betygsatt';
                
                return {
                    'Elev': s.studentName,
                    'Google Status': googleStatus,
                    'Rå Status (API)': s.state,
                    'Poäng': `${s.assignedGrade || '-'}/${s.maxPoints || '-'}`,
                    'Sista Uppdatering': s.updateTime ? new Date(s.updateTime).toLocaleString('sv-SE') : '-'
                };
            });
            
            console.table(formattedTable);
            console.groupEnd();

            console.log('Rådata för felsökning:', allStudents);
        }
    }, [selectedGroup]);

    if (!selectedGroup) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted opacity-50 p-5 w-100">
                <i className="bi bi-arrow-left-circle fs-1 mb-3"></i>
                <h4 className="fw-light">Välj en uppgift</h4>
                <p className="small">Använd piltangenterna eller klicka till vänster.</p>
            </div>
        );
    }

    return (
        <div className="h-100 d-flex flex-column">
            <div className="bg-white border-bottom p-2 d-flex justify-content-between align-items-center shadow-sm flex-shrink-0">
                <div className="overflow-hidden">
                    <h6 className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>{selectedGroup.title}</h6>
                    <div className="text-muted" style={{fontSize: '0.75rem'}}>
                        {selectedGroup.courseName} {selectedGroup.assignments?.[0]?.courseSection && <span className="badge bg-light text-muted border ms-1">{selectedGroup.assignments[0].courseSection}</span>}
                        <span className="mx-2 opacity-50">•</span> 
                        <span className="fw-bold text-primary">{selectedGroup.pending.length} att rätta</span> av {selectedGroup.studentCount} elever
                    </div>
                </div>
            </div>
            
            <div className="flex-grow-1 overflow-auto">
                <TodoTable list={selectedGroup.pending} title="Att rätta" colorClass="text-danger bg-danger bg-opacity-10" />
                <TodoTable list={selectedGroup.done} title="Klara" colorClass="text-success bg-success bg-opacity-10" />
                <TodoTable list={selectedGroup.other} title="Ej inlämnade" colorClass="text-muted" />
            </div>
        </div>
    );
};

export default TodoDetails;
