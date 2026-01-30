import React from 'react';

const TodoSidebar = ({ 
    topicGroups, 
    selectedWorkKey, 
    setSelectedWorkKey, 
    totalCount, 
    selectedCourseId, 
    fetchSingleCourseTodo, 
    isRefreshing 
}) => {
    return (
        <>
            <div className="sticky-top bg-light border-bottom p-2 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <span className="text-muted fw-bold" style={{fontSize: '0.7rem'}}>UPPGIFTER ({totalCount})</span>
                </div>
            </div>
            
            {topicGroups.map(topic => (
                <div key={topic.id} className="mb-0">
                    <div className="bg-white px-2 py-1 small fw-bold text-primary border-bottom border-top mt-0" style={{fontSize: '0.65rem', backgroundColor: '#f8f9fa !important'}}>
                        <i className="bi bi-collection me-1"></i>{topic.name.toUpperCase()}
                        {!selectedCourseId && <span className="float-end opacity-50 fw-normal" style={{fontSize: '0.6rem'}}>{topic.courseName}</span>}
                    </div>
                    <div className="list-group list-group-flush">
                        {topic.assignments.map(group => {
                            const key = `${group.courseId}-${group.id}`;
                            const isActive = selectedWorkKey === key;
                            return (
                                <button
                                    key={key}
                                    id={`assign-${key}`}
                                    onClick={() => setSelectedWorkKey(isActive ? null : key)}
                                    className={`list-group-item list-group-item-action border-bottom py-1 ps-3 pe-2 ${isActive ? 'active shadow-sm' : ''}`}
                                    style={{ transition: 'all 0.1s' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div className="overflow-hidden pe-2">
                                            <div className={`text-truncate ${isActive ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.75rem', lineHeight: '1.2' }} title={group.title}>
                                                {group.title}
                                            </div>
                                        </div>
                                        <span className={`badge rounded-pill flex-shrink-0 ${isActive ? 'bg-white text-primary' : 'bg-primary'}`} style={{ fontSize: '0.65rem' }}>
                                            {group.pending.length}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </>
    );
};

export default TodoSidebar;
