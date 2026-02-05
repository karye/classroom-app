import React, { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

const DashboardSidebar = ({ recentTodos, selectedCourseName, onClearFilter }) => {
    const [collapsedCourses, setCollapsedCourses] = useState(new Set());

    const toggleCourse = (courseName) => {
        const newCollapsed = new Set(collapsedCourses);
        if (newCollapsed.has(courseName)) {
            newCollapsed.delete(courseName);
        } else {
            newCollapsed.add(courseName);
        }
        setCollapsedCourses(newCollapsed);
    };

    // Hierarchical Grouping: Course -> Topic -> Assignment
    const groupedData = useMemo(() => {
        const courses = {};
        
        recentTodos.forEach(todo => {
            const cName = todo.courseName;
            const tName = todo.topicName || 'Övrigt';
            const wId = todo.workId;

            if (!courses[cName]) {
                courses[cName] = { name: cName, topics: {}, totalSubmissions: 0 };
            }
            
            if (!courses[cName].topics[tName]) {
                courses[cName].topics[tName] = { name: tName, assignments: {} };
            }
            
            if (!courses[cName].topics[tName].assignments[wId]) {
                courses[cName].topics[tName].assignments[wId] = {
                    id: wId,
                    title: todo.workTitle,
                    submissions: []
                };
            }
            courses[cName].topics[tName].assignments[wId].submissions.push(todo);
            courses[cName].totalSubmissions++;
        });
        
        // Convert objects to sorted arrays
        return Object.values(courses)
            .map(c => ({
                ...c,
                topics: Object.values(c.topics)
                    .map(t => ({
                        ...t,
                        assignments: Object.values(t.assignments)
                            .sort((a, b) => b.submissions.length - a.submissions.length)
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
    }, [recentTodos]);

    return (
        <div className="border-start bg-light overflow-auto custom-scrollbar d-flex flex-column" style={{ width: '320px', flexShrink: 0 }}>
            {/* Header */}
            <div className="p-3 bg-white border-bottom sticky-top z-10 shadow-sm">
                <h6 className="text-uppercase text-muted fw-bold small mb-0 d-flex justify-content-between align-items-center">
                    <span>
                        <i className="bi bi-bell-fill me-2 text-danger"></i>
                        {selectedCourseName ? 'Att rätta (Kurs)' : 'Att rätta (Alla)'}
                    </span>
                    <span className="badge bg-danger rounded-pill">{recentTodos.length}</span>
                </h6>
                
                {selectedCourseName && (
                    <div className="alert alert-info py-1 px-2 mt-2 mb-0 d-flex align-items-center justify-content-between shadow-sm border-0" style={{fontSize: '0.75rem'}}>
                        <div className="text-truncate me-2 fw-bold">
                            <i className="bi bi-funnel-fill me-1"></i>
                            {selectedCourseName}
                        </div>
                        <button className="btn btn-close btn-sm" onClick={onClearFilter} title="Rensa filter" style={{padding: '0.25rem'}}></button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-0 flex-grow-1 overflow-auto bg-white">
                {recentTodos.length > 0 ? (
                    groupedData.map(course => {
                        const isCollapsed = collapsedCourses.has(course.name);
                        return (
                            <div key={course.name} className="border-bottom">
                                {/* Course Header - CLICKABLE */}
                                <div 
                                    className="px-3 py-2 bg-primary bg-opacity-10 text-primary fw-bold d-flex justify-content-between align-items-center cursor-pointer" 
                                    style={{fontSize: '0.75rem', cursor: 'pointer'}}
                                    onClick={() => toggleCourse(course.name)}
                                >
                                    <div className="d-flex align-items-center text-truncate">
                                        <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'down'} me-2 opacity-50`}></i>
                                        <span className="text-truncate">{course.name}</span>
                                    </div>
                                    <span className="badge bg-primary bg-opacity-25 text-primary rounded-pill" style={{fontSize: '0.65rem'}}>
                                        {course.totalSubmissions}
                                    </span>
                                </div>

                                {!isCollapsed && course.topics.map(topic => (
                                    <div key={topic.name}>
                                        {/* Topic Header */}
                                        <div className="px-3 py-1 small fw-bold text-muted border-bottom bg-light bg-opacity-25" style={{fontSize: '0.65rem'}}>
                                            <i className="bi bi-collection me-1"></i>{topic.name.toUpperCase()}
                                        </div>
                                        
                                        <div className="p-2 d-flex flex-column gap-2">
                                            {topic.assignments.map(assign => (
                                                <div key={assign.id} className="card border-0 shadow-sm p-2 bg-light bg-opacity-25">
                                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                                        <div className="fw-bold text-dark small text-truncate pe-2" title={assign.title} style={{ lineHeight: '1.2' }}>
                                                            {assign.title}
                                                        </div>
                                                        <span className="badge bg-primary rounded-pill flex-shrink-0" style={{fontSize: '0.6rem'}}>
                                                            {assign.submissions.length}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Student Chips */}
                                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                                        {assign.submissions.map((sub, sIdx) => {
                                                            const nameParts = (sub.studentName || 'Elev').trim().split(/\s+/);
                                                            const displayName = nameParts.length > 1 
                                                                ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}` 
                                                                : nameParts[0];
                                                            
                                                            return (
                                                                <div key={`${sub.studentId}-${assign.id}-${sIdx}`} 
                                                                     className={`d-flex align-items-center rounded-pill px-2 py-0 border ${sub.late ? 'bg-danger-subtle border-danger text-danger' : 'bg-white border-light-subtle text-muted'}`} 
                                                                     style={{fontSize: '0.65rem', height: '18px'}}
                                                                     title={`${sub.studentName}${sub.late ? ' (SEN)' : ''}`}>
                                                                    <span className="text-truncate" style={{maxWidth: '85px'}}>{displayName}</span>
                                                                    {!!sub.late && <i className="bi bi-clock-fill ms-1" style={{fontSize: '0.55rem'}}></i>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-5 text-muted px-3">
                        <div className="bg-white rounded-circle d-inline-flex p-3 mb-3 shadow-sm border">
                            <i className="bi bi-check2-all fs-3 text-success"></i>
                        </div>
                        <h6 className="fw-bold">Allt är klart!</h6>
                        <p className="small px-4">Inga inlämningar väntar på rättning just nu.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardSidebar;
