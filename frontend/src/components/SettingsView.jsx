import React, { useState } from 'react';
import GeneralSettings from './settings/GeneralSettings';
import SystemStats from './settings/SystemStats';
import StudentRegistry from './settings/StudentRegistry';

const SettingsView = ({ 
    courses, 
    hiddenCourseIds, 
    onToggleCourse, 
    excludeFilters, 
    onUpdateFilters, 
    excludeTopicFilters, 
    onUpdateTopicFilters,
    onLoading
}) => {
    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'data' | 'students'

    return (
        <div className="container-fluid py-4 h-100 overflow-auto bg-white">
            <div className="row justify-content-center">
                <div className="col-12 col-xl-10">
                    <div className="mb-4 pb-3 border-bottom d-flex align-items-center justify-content-between">
                        <div>
                            <h2 className="h3 fw-bold mb-1 text-dark">Inställningar</h2>
                            <p className="text-muted mb-0">Hantera dina klassrum, filter och systemdata.</p>
                        </div>
                        
                        {/* Tabs */}
                        <div className="bg-light p-1 rounded-pill d-inline-flex">
                            <button 
                                className={`btn btn-sm rounded-pill px-4 fw-bold ${activeTab === 'config' ? 'btn-white shadow-sm text-primary' : 'text-muted'}`}
                                onClick={() => setActiveTab('config')}
                            >
                                <i className="bi bi-sliders me-2"></i>Anpassning
                            </button>
                            <button 
                                className={`btn btn-sm rounded-pill px-4 fw-bold ${activeTab === 'data' ? 'btn-white shadow-sm text-primary' : 'text-muted'}`}
                                onClick={() => setActiveTab('data')}
                            >
                                <i className="bi bi-database me-2"></i>Systemdata
                            </button>
                            <button 
                                className={`btn btn-sm rounded-pill px-4 fw-bold ${activeTab === 'students' ? 'btn-white shadow-sm text-primary' : 'text-muted'}`}
                                onClick={() => setActiveTab('students')}
                            >
                                <i className="bi bi-people me-2"></i>Elevregister
                            </button>
                        </div>
                    </div>

                    {activeTab === 'config' && (
                        <GeneralSettings 
                            courses={courses}
                            hiddenCourseIds={hiddenCourseIds}
                            onToggleCourse={onToggleCourse}
                            excludeFilters={excludeFilters}
                            onUpdateFilters={onUpdateFilters}
                            excludeTopicFilters={excludeTopicFilters}
                            onUpdateTopicFilters={onUpdateTopicFilters}
                        />
                    )}

                    {activeTab === 'data' && (
                        <SystemStats courses={courses} onLoading={onLoading} />
                    )}

                    {activeTab === 'students' && (
                        <StudentRegistry courses={courses} onLoading={onLoading} />
                    )}

                </div>
            </div>
        </div>
    );
};

export default SettingsView;