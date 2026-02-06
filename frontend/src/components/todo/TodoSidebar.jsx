import React from 'react';

const TodoSidebar = ({ 
    topicGroups, 
    selectedWorkKey, 
    onSelectWork, // Renamed from setSelectedWorkKey to match parent
    totalCount, 
    selectedCourseId, 
    fetchSingleCourseTodo, 
    isRefreshing 
}) => {
    return (
        <div className="d-flex flex-column h-100 border-end bg-white" style={{ width: '280px', minWidth: '280px' }}>
            <div className="sticky-top bg-light border-bottom p-2 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <span className="text-muted fw-bold" style={{fontSize: '0.7rem'}}>Uppgifter ({totalCount})</span>
                </div>
            </div>
            
            <div className="overflow-auto flex-grow-1">
                {topicGroups.map(topic => (
                    <div key={topic.id} className="mb-0">
                        <div className="px-2 py-1 small fw-bold text-primary border-bottom border-top mt-0" style={{fontSize: '0.65rem', backgroundColor: '#f8f9fa'}}>
                            <i className="bi bi-collection me-1"></i>{topic.name}
                        </div>
                        <div className="list-group list-group-flush">
                            {topic.assignments.map(group => {
                                const key = `${group.courseId}-${group.id}`;
                                const isActive = selectedWorkKey === key;
                                return (
                                    <button
                                        key={key}
                                        id={`assign-${key}`}
                                        onClick={() => onSelectWork(group.courseId, group.id)}
                                        className={`list-group-item list-group-item-action border-bottom py-2 ps-3 pe-2 ${isActive ? 'active border-primary' : ''}`}
                                        style={{ transition: 'all 0.1s', fontSize: '0.8rem' }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="text-truncate pe-2 fw-medium" title={group.workTitle || group.title}>
                                                {group.workTitle || group.title}
                                            </div>
                                            <span className={`badge rounded-pill flex-shrink-0 ${isActive ? 'bg-white text-primary' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                                                {group.pending?.length || 0}
                                            </span>
                                        </div>
                                        {group.lateCount > 0 && (
                                            <div className="mt-1">
                                                <small className="text-danger fw-bold" style={{fontSize: '0.65rem'}}>
                                                    {group.lateCount} sena
                                                </small>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodoSidebar;
