import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbRemove } from '../../db';

const SystemStats = ({ courses, onLoading }) => {
    const [storageStats, setStorageStats] = useState(null);
    const [serverStats, setServerStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [courseToClear, setCourseToClear] = useState(null); // For delete confirmation modal
    const [showFullResetModal, setShowFullResetModal] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState(null);

    useEffect(() => {
        loadStats();
    }, [courses]);

    const loadStats = async () => {
        if (!courses || courses.length === 0) {
            setLoadingStats(false);
            setStorageStats({ courses: [], totalBytes: 0 });
            return;
        }

        setLoadingStats(true);
        try {
            console.log("[DEBUG] Loading system stats...");
            // 1. Fetch Backend Stats
            const serverRes = await axios.get('/api/stats').catch(err => {
                console.warn("Backend stats fetch failed, using defaults", err);
                return { data: { dbSize: 0, totalNotes: 0, notesDistribution: [] } };
            });
            setServerStats(serverRes.data);

            // 2. Analyze IndexedDB
            const stats = [];
            let totalBytes = 0;

            for (const course of courses) {
                try {
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
                } catch (e) {
                    console.error(`Failed to load stats for course ${course.id}`, e);
                }
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
            console.error("Critical error in loadStats:", err);
        } finally {
            console.log("[DEBUG] Stats loading complete.");
            setLoadingStats(false);
        }
    };

    const handleClearCacheClick = (course) => {
        setCourseToClear(course);
    };

    const confirmClearCache = async () => {
        if (!courseToClear) return;
        try {
            await dbRemove(`course_cache_${courseToClear.id}`);
            await dbRemove(`stream_cache_${courseToClear.id}`);
            setCourseToClear(null);
            loadStats(); // Refresh stats
        } catch (err) {
            console.error("Failed to clear cache", err);
        }
    };

    const handleFullReset = async () => {
        setIsResetting(true);
        setResetError(null);
        if (onLoading) onLoading({ loading: true, message: 'Nollställer ALLT systemdata...' });
        try {
            await axios.post('/api/stats/reset');
            // Also clear EVERYTHING in IndexedDB
            const { dbClear } = await import('../../db');
            await dbClear();
            if (onLoading) onLoading({ loading: false, message: 'Nollställning klar. Startar om...' });
            window.location.reload(); // Force full app restart
        } catch (err) {
            console.error("Reset failed", err);
            if (onLoading) onLoading({ loading: false, message: 'Nollställning misslyckades.' });
            setResetError("Kunde inte nollställa databasen. Servern kan vara tillfälligt överbelastad. Försök igen om en liten stund.");
            setIsResetting(false);
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
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
                            <p className="small opacity-75 mt-2 mb-0">SQLite (Master Storage)</p>
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
                                        <td className="ps-4 fw-bold course-name">{course.name}</td>
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
                                                                                                        onClick={() => handleClearCacheClick(course)}
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

            {/* FACTORY RESET SECTION */}
            <div className="mt-5 p-4 border rounded bg-danger bg-opacity-10 mb-4 animate-fade-in">
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <h5 className="text-danger fw-bold mb-1">Totalåterställning</h5>
                        <p className="small text-muted mb-0">Rensar <strong>allt</strong> data på servern och i din webbläsare för att börja om från noll.</p>
                    </div>
                    <button className="btn btn-danger px-4 fw-bold shadow-sm" onClick={() => setShowFullResetModal(true)}>
                        Nollställ Allt
                    </button>
                </div>
            </div>

            {/* Clear Cache Confirmation Modal */}
            {courseToClear && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-danger text-white border-bottom-0">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    Rensa cache?
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setCourseToClear(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">
                                    Du är på väg att rensa den lokala cachen för <strong>{courseToClear.name}</strong>.
                                </p>
                                <p className="text-muted small mt-2 mb-0">
                                    Detta tar bort sparade inlämningar och flödesposter från din webbläsare. Ingen data tas bort från Google Classroom. Du behöver synka om kursen för att se innehållet igen.
                                </p>
                            </div>
                            <div className="modal-footer border-top-0 bg-light">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setCourseToClear(null)}>Avbryt</button>
                                <button type="button" className="btn btn-danger px-4 fw-bold" onClick={confirmClearCache}>Rensa Cache</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL RESET CONFIRMATION MODAL */}
            {showFullResetModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0 border-top border-danger border-5">
                            <div className="modal-header bg-white border-bottom-0 pt-4">
                                <h5 className="modal-title fw-bold text-danger mx-auto text-center">
                                    <i className="bi bi-exclamation-octagon-fill fs-1 d-block mb-2"></i>
                                    Varning: Total radering
                                </h5>
                            </div>
                            <div className="modal-body px-4 pb-4 text-center">
                                {resetError ? (
                                    <div className="alert alert-danger border-0">
                                        <h6 className="fw-bold"><i className="bi bi-x-circle-fill me-2"></i>Nollställning misslyckades</h6>
                                        <p className="small mb-0">{resetError}</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="mb-3 fw-bold">
                                            Detta kommer att radera ALL sparad information permanent.
                                        </p>
                                        <div className="alert alert-warning border-0 small text-start shadow-sm">
                                            <ul className="mb-0">
                                                <li><strong>Alla privata anteckningar raderas.</strong></li>
                                                <li><strong>Alla personliga inställningar raderas.</strong></li>
                                                <li>Alla klassrum, inlämningar och betyg raderas lokalt.</li>
                                                <li>Hela databasens struktur återskapas från grunden.</li>
                                            </ul>
                                        </div>
                                        <p className="text-muted small mb-0 mt-3">Ingen data tas bort från Google Classroom, men allt arbete du gjort <em>inuti denna app</em> kommer att försvinna.</p>
                                    </>
                                )}
                            </div>
                            <div className="modal-footer border-top-0 bg-light justify-content-center pb-4">
                                {resetError ? (
                                    <button type="button" className="btn btn-dark px-5 fw-bold" onClick={() => { setResetError(null); setShowFullResetModal(false); }}>Stäng</button>
                                ) : (
                                    <>
                                        <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowFullResetModal(false)} disabled={isResetting}>Avbryt</button>
                                        <button type="button" className="btn btn-danger px-4 fw-bold" onClick={handleFullReset} disabled={isResetting}>
                                            {isResetting ? 'Nollställer...' : 'Jag förstår, nollställ allt'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemStats;
