import React, { useState } from 'react';

const GeneralSettings = ({ 
    courses, 
    hiddenCourseIds, 
    onToggleCourse, 
    excludeFilters, 
    onUpdateFilters, 
    excludeTopicFilters, 
    onUpdateTopicFilters 
}) => {
    const [filterInput, setFilterInput] = useState('');
    const [topicInput, setTopicInput] = useState('');

    const handleAddFilter = () => {
        if (filterInput.trim() && !excludeFilters.includes(filterInput.trim())) {
            onUpdateFilters([...excludeFilters, filterInput.trim()]);
            setFilterInput('');
        }
    };

    const handleAddTopicFilter = () => {
        if (topicInput.trim() && !excludeTopicFilters.includes(topicInput.trim())) {
            onUpdateTopicFilters([...excludeTopicFilters, topicInput.trim()]);
            setTopicInput('');
        }
    };

    return (
        <div className="row g-4 animate-fade-in">
            {/* COURSE FILTER */}
            <div className="col-lg-6">
                <div className="card h-100 border-0 shadow-sm bg-light">
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                            <div className="bg-primary bg-opacity-10 p-2 rounded me-3 text-primary">
                                <i className="bi bi-grid-fill fs-4"></i>
                            </div>
                            <h3 className="h5 fw-bold mb-0">Dina klassrum</h3>
                        </div>
                        <p className="small text-muted mb-4">
                            Välj vilka klassrum som ska vara aktiva. Inaktiva kurser döljs från scheman, matriser och att-göra-listor.
                        </p>
                        <div className="course-list-container" style={{ maxHeight: '400px' }}>
                            {courses.length > 0 ? courses.map(course => (
                                <div 
                                    key={course.id} 
                                    className={`course-list-item ${hiddenCourseIds.includes(course.id) ? 'opacity-50' : ''}`} 
                                    onClick={() => onToggleCourse(course.id)}
                                >
                                    <input 
                                        className="form-check-input my-0 me-3" 
                                        type="checkbox" 
                                        checked={!hiddenCourseIds.includes(course.id)}
                                        onChange={() => {}} 
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <div className="flex-grow-1">
                                        <div className="course-name mb-1">{course.name}</div>
                                        {course.section && <div className="course-section">{course.section}</div>}
                                    </div>
                                </div>
                            )) : <div className="p-4 text-center text-muted italic">Inga kurser hittades.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTERS COLUMN */}
            <div className="col-lg-6 d-flex flex-column gap-4">
                {/* ASSIGNMENT FILTER */}
                <div className="card border-0 shadow-sm bg-light">
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                            <div className="bg-success bg-opacity-10 p-2 rounded me-3 text-success">
                                <i className="bi bi-funnel-fill fs-4"></i>
                            </div>
                            <h3 className="h5 fw-bold mb-0">Dölj uppgifter</h3>
                        </div>
                        <p className="small text-muted mb-3">
                            Filtrera bort specifika uppgifter baserat på nyckelord i titeln.
                        </p>
                        <div className="input-group mb-3 shadow-sm">
                            <input 
                                type="text" 
                                className="form-control border-0" 
                                placeholder="Lägg till ord (t.ex. Lunch)..." 
                                value={filterInput}
                                onChange={(e) => setFilterInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                            />
                            <button className="btn btn-success px-4" onClick={handleAddFilter}>Lägg till</button>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {excludeFilters.map(f => (
                                <span key={f} className="badge bg-white text-dark border d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm">
                                    {f} 
                                    <i className="bi bi-x-circle-fill text-danger cursor-pointer" onClick={(e) => { e.stopPropagation(); onUpdateFilters(excludeFilters.filter(x => x !== f)); }}></i>
                                </span>
                            ))}
                            {excludeFilters.length === 0 && <span className="text-muted small fst-italic">Inga filter aktiva.</span>}
                        </div>
                    </div>
                </div>

                {/* TOPIC FILTER */}
                <div className="card border-0 shadow-sm bg-light">
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                            <div className="bg-warning bg-opacity-10 p-2 rounded me-3 text-warning">
                                <i className="bi bi-folder-x fs-4"></i>
                            </div>
                            <h3 className="h5 fw-bold mb-0">Dölj hela ämnen</h3>
                        </div>
                        <p className="small text-muted mb-3">
                            Dölj alla uppgifter som tillhör ett specifikt ämne (Topic).
                        </p>
                        <div className="input-group mb-3 shadow-sm">
                            <input 
                                type="text" 
                                className="form-control border-0" 
                                placeholder="Lägg till ämne (t.ex. Administration)..." 
                                value={topicInput}
                                onChange={(e) => setTopicInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTopicFilter()}
                            />
                            <button className="btn btn-warning px-4 fw-bold" onClick={handleAddTopicFilter}>Lägg till</button>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {excludeTopicFilters.map(f => (
                                <span key={f} className="badge bg-white text-dark border d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm">
                                    {f} 
                                    <i className="bi bi-x-circle-fill text-danger cursor-pointer" onClick={(e) => { e.stopPropagation(); onUpdateTopicFilters(excludeTopicFilters.filter(x => x !== f)); }}></i>
                                </span>
                            ))}
                            {excludeTopicFilters.length === 0 && <span className="text-muted small fst-italic">Inga filter aktiva.</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
