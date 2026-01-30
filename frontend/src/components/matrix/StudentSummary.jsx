import React from 'react';

const StudentSummary = ({ student, courseName, onClose, groupedWork, getSubmission }) => {
    if (!student) return null;

    return (
        <div className="student-summary-overlay no-print-bg" onClick={onClose}>
            <div className="student-summary-content d-flex flex-column" onClick={e => e.stopPropagation()}>
                <div className="student-summary-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        {student.profile.photoUrl ? (
                            <img src={student.profile.photoUrl} alt="" className="rounded-circle border" style={{ width: '48px', height: '48px' }} />
                        ) : (
                            <div className="bg-light rounded-circle border d-flex align-items-center justify-content-center text-muted" style={{ width: '48px', height: '48px' }}>
                                <i className="bi bi-person fs-4"></i>
                            </div>
                        )}
                        <div>
                            <h4 className="mb-0 fw-bold">{student.profile.name.fullName}</h4>
                            <span className="text-muted">{courseName}</span>
                        </div>
                    </div>
                    <div className="d-flex gap-2 no-print">
                        <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => window.print()}>
                            <i className="bi bi-printer"></i> Skriv ut
                        </button>
                        <button className="btn btn-light" onClick={onClose}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                <div className="student-summary-body">
                    {groupedWork.map(group => (
                        <div key={group.id} className="mb-5">
                            <h5 className="text-primary border-bottom pb-2 fw-bold mb-3">{group.name.toUpperCase()}</h5>
                            <table className="table table-sm table-hover border-top">
                                <thead>
                                    <tr className="table-light">
                                        <th className="ps-3 py-2 border-0" style={{ width: '60%' }}>UPPGIFT</th>
                                        <th className="py-2 border-0 text-center" style={{ width: '20%' }}>STATUS</th>
                                        <th className="py-2 border-0 text-end pe-3" style={{ width: '20%' }}>RESULTAT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.assignments.map(cw => {
                                        const sub = getSubmission(student.userId, cw.id);
                                        let statusIcon = <i className="bi bi-dash-circle text-danger opacity-75" title="Ej inlämnad"></i>;
                                        let resultText = "-";

                                        if (sub) {
                                            switch (sub.state) {
                                                case 'TURNED_IN': 
                                                    statusIcon = <i className="bi bi-check text-success fs-5" title="Inlämnad"></i>;
                                                    break;
                                                case 'RETURNED': 
                                                    statusIcon = <i className="bi bi-check-all text-success fs-5" title="Klar"></i>;
                                                    break;
                                                case 'RECLAIMED_BY_STUDENT': 
                                                    statusIcon = <i className="bi bi-arrow-counterclockwise text-warning" title="Återtaget"></i>;
                                                    break;
                                                default: 
                                                    statusIcon = <i className="bi bi-dash-circle text-danger opacity-75" title="Ej inlämnad"></i>;
                                            }
                                            if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
                                                resultText = `${sub.assignedGrade} / ${cw.maxPoints}`;
                                            }
                                        }

                                        return (
                                            <tr key={cw.id} className="align-middle">
                                                <td className="ps-3 py-1 border-bottom" style={{ fontSize: '0.85rem' }}>{cw.title}</td>
                                                <td className="text-center py-1 border-bottom">
                                                    {statusIcon}
                                                </td>
                                                <td className="text-end py-1 border-bottom pe-3 fw-bold" style={{ fontSize: '0.85rem' }}>
                                                    {resultText}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentSummary;
