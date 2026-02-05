import React, { useEffect } from 'react';
import TodoTable from './TodoTable';

const TodoDetails = ({ assignment }) => {
    if (!assignment) {
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
                    <h6 className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>{assignment.title}</h6>
                    <div className="text-muted" style={{fontSize: '0.75rem'}}>
                        {assignment.courseName} {assignment.assignments?.[0]?.courseSection && <span className="badge bg-light text-muted border ms-1">{assignment.assignments[0].courseSection}</span>}
                        <span className="mx-2 opacity-50">•</span> 
                        <span className="fw-bold text-primary">{assignment.pending.length} att rätta</span> av {assignment.studentCount} elever
                    </div>
                </div>
            </div>
            
            <div className="flex-grow-1 overflow-auto">
                <TodoTable list={assignment.pending} title="Att rätta" colorClass="text-danger bg-danger bg-opacity-10" />
                <TodoTable list={assignment.done} title="Klara" colorClass="text-success bg-success bg-opacity-10" />
                <TodoTable list={assignment.other} title="Ej inlämnade" colorClass="text-muted" />
            </div>
        </div>
    );
};

export default TodoDetails;
