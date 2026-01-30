import React from 'react';
import TodoTable from './TodoTable';

const TodoDetails = ({ selectedGroup }) => {
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
                        {selectedGroup.courseName} 
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
