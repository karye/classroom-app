import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbRemove } from '../db';

const SettingsView = ({ 
    courses, 
    hiddenCourseIds, 
    onToggleCourse, 
    excludeFilters, 
    onUpdateFilters, 
    excludeTopicFilters, 
    onUpdateTopicFilters
}) => {
    
    // State
    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'data'
    const [filterInput, setFilterInput] = useState('');
    const [topicInput, setTopicInput] = useState('');
    
    // Data Stats State
    const [storageStats, setStorageStats] = useState(null);
    const [serverStats, setServerStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (activeTab === 'data') {
            loadStats();
        }
    }, [activeTab, courses]);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            // 1. Fetch Backend Stats
            const serverRes = await axios.get('/api/stats');
            setServerStats(serverRes.data);

            // 2. Analyze IndexedDB
            const stats = [];
            let totalBytes = 0;

            for (const course of courses) {
                // Matrix Data
                const matrixCache = await dbGet(`course_cache_${course.id}`);
                const streamCache = await dbGet(`stream_cache_${course.id}`);
                
                // Estimate Size
                const matrixSize = matrixCache ? JSON.stringify(matrixCache).length : 0;
                const streamSize = streamCache ? JSON.stringify(streamCache).length : 0;
                totalBytes += (matrixSize + streamSize);

                // Note count from backend for this course
                const serverNote = serverRes.data.notesDistribution?.find(n => n.course_id === course.id);

                stats.push({
                    id: course.id,
                    name: course.name,
                    lastSync: matrixCache?.timestamp || streamCache?.timestamp,
                    size: (matrixSize + streamSize),
                    assignmentCount: matrixCache?.data?.coursework?.length || 0,
                    postCount: streamCache?.data?.length || 0,
                    noteCount: serverNote ? serverNote.count : 0
                });
            }

            // Global Schedules
            const scheduleCache = await dbGet('schedule_cache_global');
            const scheduleSize = scheduleCache ? JSON.stringify(scheduleCache).length : 0;
            totalBytes += scheduleSize;
            
            setStorageStats({
                courses: stats,
                totalBytes: totalBytes,
                scheduleLastSync: scheduleCache?.timestamp
            });

        } catch (err) {
            console.error("Failed to load stats", err);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleClearCache = async (courseId) => {
        if (!window.confirm(`Är du säker på att du vill rensa cachen för denna kurs?`)) return;
        await dbRemove(`course_cache_${courseId}`);
        await dbRemove(`stream_cache_${courseId}`);
        loadStats(); // Refresh
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

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
                        </div>
                    </div>

                    {activeTab === 'config' ? (
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
                                        <div className="bg-white border rounded p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            {courses.length > 0 ? courses.map(course => (
                                                <div 
                                                    key={course.id} 
                                                    className={`d-flex align-items-center p-2 border-bottom hover-bg-light transition-all ${hiddenCourseIds.includes(course.id) ? 'opacity-50' : ''}`} 
                                                    style={{ cursor: 'pointer' }} 
                                                    onClick={() => onToggleCourse(course.id)}
                                                >
                                                    <input 
                                                        className="form-check-input my-0 me-3" 
                                                        type="checkbox" 
                                                        checked={!hiddenCourseIds.includes(course.id)}
                                                        onChange={() => {}} 
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <div className="flex-grow-1 lh-1">
                                                        <div className="fw-bold text-dark mb-1" style={{ fontSize: '0.9rem' }}>{course.name}</div>
                                                        {course.section && <div className="small text-muted" style={{ fontSize: '0.75rem' }}>{course.section}</div>}
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
                    ) : (
                        <div className="animate-fade-in">
                            {/* STORAGE DASHBOARD */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-4">
                                    <div className="card border-0 shadow-sm bg-primary text-white h-100">
                                        <div className="card-body">
                                            <h6 className="text-uppercase opacity-75 small fw-bold mb-2">Lokal Cache (Webbläsare)</h6>
                                            <h2 className="display-6 fw-bold mb-0">{storageStats ? formatBytes(storageStats.totalBytes) : '-'}</h2>
                                            <p className="small opacity-75 mt-2 mb-0">IndexedDB Storage</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card border-0 shadow-sm bg-dark text-white h-100">
                                        <div className="card-body">
                                            <h6 className="text-uppercase opacity-75 small fw-bold mb-2">Backend Databas</h6>
                                            <h2 className="display-6 fw-bold mb-0">{serverStats ? formatBytes(serverStats.dbSize) : '-'}</h2>
                                            <p className="small opacity-75 mt-2 mb-0">SQLite (Krypterade anteckningar)</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card border-0 shadow-sm bg-white h-100">
                                        <div className="card-body">
                                            <h6 className="text-uppercase text-muted small fw-bold mb-2">Totalt antal anteckningar</h6>
                                            <h2 className="display-6 fw-bold mb-0 text-primary">{serverStats ? serverStats.totalNotes : '-'}</h2>
                                            <p className="small text-muted mt-2 mb-0">Loggboksinlägg sparade</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card border-0 shadow-sm">
                                <div className="card-header bg-white py-3">
                                    <h5 className="fw-bold mb-0">Status per Kurs</h5>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-4">Kursnamn</th>
                                                <th>Senast Synkad</th>
                                                <th>Data (Cache)</th>
                                                <th>Innehåll</th>
                                                <th>Loggbok (Server)</th>
                                                <th className="text-end pe-4">Åtgärd</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingStats ? (
                                                <tr><td colSpan="6" className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm me-2"></div>Läser in statistik...</td></tr>
                                            ) : storageStats && storageStats.courses.length > 0 ? (
                                                storageStats.courses.map(course => (
                                                    <tr key={course.id}>
                                                        <td className="ps-4 fw-bold">{course.name}</td>
                                                        <td className="text-muted small">
                                                            {course.lastSync ? new Date(course.lastSync).toLocaleString() : <span className="badge bg-light text-muted border">Aldrig</span>}
                                                        </td>
                                                        <td><span className="badge bg-light text-dark border">{formatBytes(course.size)}</span></td>
                                                        <td className="small text-muted">
                                                            {course.assignmentCount} uppg, {course.postCount} inlägg
                                                        </td>
                                                        <td>
                                                            {course.noteCount > 0 ? <span className="badge bg-primary rounded-pill">{course.noteCount} st</span> : <span className="text-muted">-</span>}
                                                        </td>
                                                        <td className="text-end pe-4">
                                                            <button 
                                                                className="btn btn-outline-danger btn-sm" 
                                                                onClick={() => handleClearCache(course.id)}
                                                                title="Rensa cache för denna kurs"
                                                                disabled={course.size === 0}
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" className="text-center py-4 text-muted">Ingen data hittades.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SettingsView;
