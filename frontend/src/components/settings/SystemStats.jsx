import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbRemove } from '../../db';

const SystemStats = ({ courses }) => {
    const [storageStats, setStorageStats] = useState(null);
    const [serverStats, setServerStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        loadStats();
    }, [courses]);

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
    );
};

export default SystemStats;
