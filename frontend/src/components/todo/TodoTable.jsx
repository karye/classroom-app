import React from 'react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import StatusBadge from '../common/StatusBadge';

const TodoTable = ({ list, title, colorClass, emptyMsg }) => {
    if (list.length === 0 && !emptyMsg) return null;

    return (
        <div className="mb-4">
            <div className={`bg-light px-3 py-1 border-bottom d-flex justify-content-between align-items-center ${colorClass}`} style={{fontSize: '0.7rem', fontWeight: 'bold'}}>
                <span>{title.toUpperCase()} ({list.length})</span>
            </div>
            {list.length > 0 ? (
                <table className="table table-hover table-sm mb-0 w-100">
                    <tbody style={{fontSize: '0.8rem'}}>
                        {[...list].sort((a, b) => {
                            if (a.state === 'TURNED_IN') {
                                const timeA = a.updateTime ? new Date(a.updateTime).getTime() : 0;
                                const timeB = b.updateTime ? new Date(b.updateTime).getTime() : 0;
                                return timeB - timeA;
                            }
                            return a.studentName.localeCompare(b.studentName, 'sv');
                        }).map((todo, index) => (
                            <tr key={todo.id} className="align-middle border-bottom">
                                <td className="ps-3 py-1" style={{ width: '40%' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="text-muted small" style={{ minWidth: '20px' }}>{index + 1}.</span>
                                        {todo.studentPhoto ? (
                                            <img src={todo.studentPhoto} alt="" className="rounded-circle border" style={{ width: '24px', height: '24px' }} />
                                        ) : (
                                            <div className="bg-light rounded-circle border d-flex align-items-center justify-content-center text-muted" style={{ width: '24px', height: '24px' }}>
                                                <i className="bi bi-person" style={{fontSize: '0.8rem'}}></i>
                                            </div>
                                        )}
                                        <span className={`fw-bold text-truncate ${todo.state === 'CREATED' || todo.state === 'NEW' ? 'text-muted' : 'text-dark'}`} style={{maxWidth: '180px'}}>{todo.studentName}</span>
                                    </div>
                                </td>
                                <td className="py-1" style={{ width: '25%' }}>
                                    <StatusBadge status={todo.state} late={todo.late} />
                                </td>
                                <td className="text-end py-1 text-muted pe-3" style={{fontSize: '0.75rem', width: '25%'}}>
                                    {todo.state === 'TURNED_IN' && todo.updateTime ? format(parseISO(todo.updateTime), "d MMM HH:mm", { locale: sv }) : ''}
                                    {todo.state === 'RETURNED' && typeof todo.assignedGrade !== 'undefined' && todo.assignedGrade !== null && (
                                        <span className="fw-bold text-primary">Betyg: {todo.assignedGrade}</span>
                                    )}
                                </td>
                                <td className="text-center py-1" style={{ width: '10%' }}>
                                    <a href={todo.submissionLink} target="_blank" rel="noreferrer" className="text-primary opacity-75 hover-opacity-100" title="Öppna inlämning">
                                        <i className="bi bi-box-arrow-up-right" style={{fontSize: '0.8rem'}}></i>
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="p-3 text-muted small fst-italic">{emptyMsg}</div>
            )}
        </div>
    );
};

export default TodoTable;
