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
    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'data' | 'students'
    const [filterInput, setFilterInput] = useState('');
    const [topicInput, setTopicInput] = useState('');
    const [importText, setImportText] = useState('');
    const [importPreview, setImportPreview] = useState(null); // { matches: [], failures: [], groupName: '' }
    const [isImporting, setIsImporting] = useState(false);
    const [studentList, setStudentList] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupMappings, setGroupMappings] = useState({}); // { groupName: courseId }
    const [groupToDelete, setGroupToDelete] = useState(null); // For delete confirmation modal
    
    // Data Stats State
    const [storageStats, setStorageStats] = useState(null);
    const [serverStats, setServerStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (activeTab === 'data') {
            loadStats();
        } else if (activeTab === 'students') {
            fetchStudentClasses();
            fetchMappings();
        }
    }, [activeTab, courses]);

    const fetchMappings = async () => {
        try {
            const res = await axios.get('/api/groups/mappings');
            const map = {};
            res.data.forEach(m => map[m.group_name] = m.course_id);
            setGroupMappings(map);
        } catch (err) { console.error("Fetch mappings failed", err); }
    };

    const handleMapGroup = async (groupName, courseId) => {
        try {
            await axios.post('/api/groups/mappings', { groupName, courseId });
            setGroupMappings(prev => ({ ...prev, [groupName]: courseId }));
        } catch (err) { console.error("Map failed", err); }
    };

    const fetchStudentClasses = async () => {
        try {
            const res = await axios.get('/api/students/classes');
            setStudentList(res.data);
        } catch (err) {
            console.error("Failed to fetch student classes", err);
        }
    };

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

    const handlePreviewImport = async () => {
        if (!importText.trim()) return;
        setIsImporting(true);
        try {
            // Dry run to get preview
            const res = await axios.post('/api/students/import?dryRun=true', { text: importText });
            setImportPreview(res.data);
        } catch (err) {
            console.error("Preview failed", err);
            alert("Kunde inte tolka listan. Kontrollera formatet.");
        } finally {
            setIsImporting(false);
        }
    };

    const confirmImport = async () => {
        if (!importPreview) return;
        setIsImporting(true);
        try {
            // Actual save
            await axios.post('/api/students/import', { text: importText }); // Send same text again for simplicity
            setImportText('');
            setImportPreview(null);
            fetchStudentClasses(); // Auto-refresh!
        } catch (err) {
            console.error("Save failed", err);
            alert("Kunde inte spara.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDeleteStudent = async (googleId) => {
        if (!window.confirm("Ta bort denna koppling?")) return;
        try {
            await axios.delete(`/api/students/classes/${googleId}`);
            fetchStudentClasses();
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const handleDeleteGroupClick = (groupName, e) => {
        e.stopPropagation(); 
        setGroupToDelete(groupName);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;
        try {
            await axios.delete(`/api/students/groups/${encodeURIComponent(groupToDelete)}`);
            if (selectedGroup === groupToDelete) setSelectedGroup(null);
            setGroupToDelete(null);
            fetchStudentClasses();
        } catch (err) {
            console.error("Delete group failed", err);
            alert("Kunde inte radera gruppen.");
        }
    };

    // Group students by GROUP
    const groupedStudents = React.useMemo(() => {
        const groups = {};
        studentList.forEach(s => {
            const gName = s.group_name || 'Osorterade';
            if (!groups[gName]) groups[gName] = [];
            groups[gName].push(s);
        });
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [studentList]);

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
                    ) : activeTab === 'students' ? (
                        <div className="animate-fade-in">
                            <div className="card border-0 shadow-sm bg-light mb-4">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center mb-3">
                                        <div className="bg-info bg-opacity-10 p-2 rounded me-3 text-info">
                                            <i className="bi bi-clipboard-data fs-4"></i>
                                        </div>
                                        <div>
                                            <h3 className="h5 fw-bold mb-0">Importera grupplistor</h3>
                                            <p className="small text-muted mb-0">Klistra in listor från SchoolSoft för att visa rätt klass i översikterna.</p>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <textarea 
                                            className="form-control font-monospace small" 
                                            rows="3" 
                                            placeholder={`Klistra in tabell här (Nr Klass Namn)...`}
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-between">
                                        <button 
                                            className="btn btn-primary px-4 fw-bold btn-sm" 
                                            onClick={handlePreviewImport} 
                                            disabled={isImporting || !importText.trim()}
                                        >
                                            {isImporting ? <><span className="spinner-border spinner-border-sm me-2"></span>Bearbetar...</> : 'Importera'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* TWO COLUMN GROUP BROWSER */}
                            {studentList.length > 0 ? (
                                <div className="row g-0 border rounded overflow-hidden shadow-sm bg-white animate-fade-in" style={{ minHeight: '400px' }}>
                                    {/* Left: Groups */}
                                    <div className="col-4 border-end bg-light overflow-auto" style={{ maxHeight: '500px' }}>
                                        <div className="p-2 border-bottom bg-white fw-bold text-muted small text-uppercase">Grupper</div>
                                        <div className="list-group list-group-flush">
                                            {groupedStudents.map(([className, students]) => (
                                                <button 
                                                    key={className}
                                                    className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 px-3 py-2 ${selectedGroup === className ? 'active fw-bold' : ''}`}
                                                    onClick={() => setSelectedGroup(className)}
                                                >
                                                    <span className="text-truncate me-2">{className}</span>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className={`badge rounded-pill ${selectedGroup === className ? 'bg-white text-primary' : 'bg-secondary text-white opacity-50'}`}>
                                                            {students.length}
                                                        </span>
                                                        <div 
                                                            className={`btn btn-link p-0 ${selectedGroup === className ? 'text-white' : 'text-danger'} opacity-50 hover-opacity-100`}
                                                            onClick={(e) => handleDeleteGroupClick(className, e)}
                                                            title="Radera hela gruppen"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right: Students */}
                                    <div className="col-8 overflow-auto" style={{ maxHeight: '500px' }}>
                                        <div className="p-2 border-bottom bg-white d-flex justify-content-between align-items-center sticky-top">
                                            <div className="fw-bold text-muted small text-uppercase">
                                                Elever i {selectedGroup || '...'}
                                                {selectedGroup && <span className="text-muted fw-normal ms-2">({groupedStudents.find(g => g[0] === selectedGroup)?.[1].length} st)</span>}
                                            </div>
                                            
                                            {selectedGroup && (
                                                <select 
                                                    className="form-select form-select-sm border-primary" 
                                                    style={{ width: '250px' }}
                                                    value={groupMappings[selectedGroup] || ""}
                                                    onChange={(e) => handleMapGroup(selectedGroup, e.target.value)}
                                                >
                                                    <option value="">-- Koppla till Classroom --</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        
                                        {selectedGroup ? (
                                            <ul className="list-group list-group-flush">
                                                {groupedStudents.find(g => g[0] === selectedGroup)?.[1].map(student => (
                                                    <li key={student.google_id} className="list-group-item d-flex justify-content-between align-items-center px-3 py-2">
                                                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                                                            <i className="bi bi-person text-muted opacity-50"></i>
                                                            <span className="text-truncate fw-bold">{student.student_name}</span>
                                                            <span className="badge bg-light text-muted border small">{student.class_name}</span>
                                                        </div>
                                                        <button className="btn btn-link text-danger p-0 opacity-25 hover-opacity-100" onClick={() => handleDeleteStudent(student.google_id)} title="Ta bort koppling">
                                                            <i className="bi bi-x-circle-fill"></i>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50 p-5">
                                                <i className="bi bi-arrow-left-circle fs-1 mb-3"></i>
                                                <p>Välj en grupp till vänster</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-5 bg-white border border-dashed rounded animate-fade-in shadow-sm">
                                    <div className="mb-4">
                                        <div className="bg-light d-inline-flex p-4 rounded-circle mb-3">
                                            <i className="bi bi-people text-muted fs-1"></i>
                                        </div>
                                        <h4 className="fw-bold text-dark">Inga grupplistor importerade</h4>
                                        <p className="text-muted mx-auto" style={{ maxWidth: '500px' }}>
                                            Här kan du organisera dina elever efter deras faktiska klasser och grupper. 
                                            Det gör det enklare att skilja på elever i sammanslagna kurser.
                                        </p>
                                    </div>
                                    <div className="d-flex justify-content-center gap-4 text-start">
                                        <div className="small">
                                            <div className="fw-bold text-primary mb-1">1. Kopiera</div>
                                            <div className="text-muted">Kopiera grupplistan från SchoolSoft (tabellen med Nr, Klass, Namn).</div>
                                        </div>
                                        <div className="small">
                                            <div className="fw-bold text-primary mb-1">2. Klistra in</div>
                                            <div className="text-muted">Använd rutan ovan för att klistra in texten och klicka på Importera.</div>
                                        </div>
                                        <div className="small">
                                            <div className="fw-bold text-primary mb-1">3. Se resultat</div>
                                            <div className="text-muted">Eleverna kommer nu visa sin rätta klass i Matris- och Todo-vyn.</div>
                                        </div>
                                    </div>
                                </div>
                            )}
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

            {/* Import Confirmation Modal */}
            {importPreview && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-light">
                                <div>
                                    <h5 className="modal-title fw-bold">Bekräfta Import</h5>
                                    <p className="mb-0 small text-muted">Hittade grupp: <strong>{importPreview.groupName}</strong></p>
                                </div>
                                <button type="button" className="btn-close" onClick={() => setImportPreview(null)}></button>
                            </div>
                            <div className="modal-body p-0">
                                {importPreview.matches.length > 0 && (
                                    <div className="p-3">
                                        <h6 className="text-success fw-bold"><i className="bi bi-check-circle-fill me-2"></i>{importPreview.matches.length} elever matchade</h6>
                                        <div className="border rounded overflow-hidden">
                                            <table className="table table-sm table-striped mb-0 small">
                                                <thead className="table-light">
                                                    <tr><th>Elev (Google)</th><th>Klass (Import)</th></tr>
                                                </thead>
                                                <tbody>
                                                    {importPreview.matches.map((m, i) => (
                                                        <tr key={i}><td>{m.name}</td><td>{m.class}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                
                                {importPreview.failures.length > 0 && (
                                    <div className="p-3 bg-warning bg-opacity-10 border-top border-warning">
                                        <h6 className="text-warning fw-bold"><i className="bi bi-exclamation-triangle-fill me-2"></i>{importPreview.failures.length} kunde inte matchas</h6>
                                        <p className="small mb-2">Dessa namn hittades inte i Google Classroom. Kontrollera stavningen eller om eleven finns i dina kurser.</p>
                                        <ul className="list-group list-group-flush small border rounded">
                                            {importPreview.failures.map((f, i) => (
                                                <li key={i} className="list-group-item bg-transparent text-muted">
                                                    {f.rawName} <span className="badge bg-secondary opacity-50 ms-2">{f.class}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setImportPreview(null)}>Avbryt</button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary px-4 fw-bold" 
                                    onClick={confirmImport}
                                    disabled={importPreview.matches.length === 0 || isImporting}
                                >
                                    {isImporting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save me-2"></i>}
                                    Spara till databas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Group Confirmation Modal */}
            {groupToDelete && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-danger text-white border-bottom-0">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                    Radera grupp?
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setGroupToDelete(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">
                                    Du är på väg att ta bort gruppen <strong>{groupToDelete}</strong>.
                                </p>
                                <p className="text-muted small mt-2 mb-0">
                                    Detta tar bort kopplingen mellan eleverna i denna lista och deras klassnamn i systemet. Eleverna tas <strong>inte</strong> bort från Google Classroom.
                                </p>
                            </div>
                            <div className="modal-footer border-top-0 bg-light">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setGroupToDelete(null)}>Avbryt</button>
                                <button type="button" className="btn btn-danger px-4 fw-bold" onClick={confirmDeleteGroup}>Radera</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
