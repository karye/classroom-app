import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

const DashboardSidebar = ({ recentTodos, selectedCourseName, onClearFilter }) => {
    return (
        <div className="border-start bg-light overflow-auto p-3 custom-scrollbar" style={{ width: '320px', flexShrink: 0 }}>
            {/* Recent Todos Section */}
            <div>
                <h6 className="text-uppercase text-muted fw-bold small mb-3 d-flex justify-content-between align-items-center">
                    <span>
                        <i className="bi bi-bell-fill me-2"></i>
                        {selectedCourseName ? 'Att rätta (Kurs)' : 'Att rätta (Top 5)'}
                    </span>
                    <span className="badge bg-danger rounded-pill">{recentTodos.length > 0 ? recentTodos.length : '0'}</span>
                </h6>
                
                {selectedCourseName && (
                    <div className="alert alert-info py-2 px-3 mb-3 d-flex align-items-center justify-content-between shadow-sm border-0" style={{fontSize: '0.8rem'}}>
                        <div className="text-truncate me-2 fw-bold">
                            <i className="bi bi-funnel-fill me-2"></i>
                            {selectedCourseName}
                        </div>
                        <button className="btn btn-close btn-sm" onClick={onClearFilter} title="Rensa filter"></button>
                    </div>
                )}
                
                <div className="d-flex flex-column gap-2">
                    {recentTodos.length > 0 ? recentTodos.map((todo, idx) => (
                        <div key={todo.workId + idx} className="card border-0 shadow-sm p-2">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                                <span className="badge bg-light text-primary border" style={{fontSize: '0.65rem'}}>{todo.courseName}</span>
                                {todo.late && <span className="badge bg-danger text-white" style={{fontSize: '0.6rem'}}>SEN</span>}
                            </div>
                            <div className="fw-bold text-dark small mb-1 text-truncate" title={todo.workTitle}>
                                {todo.workTitle}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <img 
                                    src={todo.studentPhotoUrl ? `//${todo.studentPhotoUrl.replace(/^https?:\/\//, '')}` : 'https://lh3.googleusercontent.com/a/default-user'} 
                                    alt="" 
                                    className="rounded-circle" 
                                    style={{width: '20px', height: '20px'}}
                                />
                                <div className="text-muted small text-truncate" style={{fontSize: '0.75rem'}}>
                                    {todo.studentName}
                                </div>
                                <div className="ms-auto text-muted fst-italic" style={{fontSize: '0.65rem'}}>
                                    {todo.updateTime ? formatDistanceToNow(new Date(todo.updateTime), { addSuffix: true, locale: sv }) : ''}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-4 text-muted bg-white rounded border border-dashed">
                            <i className="bi bi-check-circle fs-4 mb-2 d-block text-success opacity-50"></i>
                            <span className="small">Allt är rättat!</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardSidebar;
