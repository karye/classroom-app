import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentRegistry = ({ courses }) => {
    const [importText, setImportText] = useState('');
    const [importPreview, setImportPreview] = useState(null); 
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [studentList, setStudentList] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupMappings, setGroupMappings] = useState({});
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [syncResult, setSyncResult] = useState(null); // { message, matched, total }

    useEffect(() => {
        fetchStudentClasses();
        fetchMappings();
    }, []);

    const fetchStudentClasses = async () => {
        try {
            const res = await axios.get('/api/students/classes');
            setStudentList(res.data);
        } catch (err) { console.error("Failed to fetch student classes", err); }
    };

    const fetchMappings = async () => {
        try {
            const res = await axios.get('/api/groups/mappings');
            const map = {};
            res.data.forEach(m => map[m.group_name] = m.course_id);
            setGroupMappings(map);
        } catch (err) { console.error("Fetch mappings failed", err); }
    };

    const handlePreviewImport = async () => {
        if (!importText.trim()) return;
        setIsImporting(true);
        try {
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
            await axios.post('/api/students/import', { text: importText });
            setImportText('');
            setImportPreview(null);
            fetchStudentClasses();
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

    const handleMapGroup = async (groupName, courseId) => {
        try {
            await axios.post('/api/groups/mappings', { groupName, courseId });
            setGroupMappings(prev => ({ ...prev, [groupName]: courseId }));
        } catch (err) { console.error("Map failed", err); }
    };

    const handleSyncGroup = async () => {
        const courseId = groupMappings[selectedGroup];
        if (!selectedGroup || !courseId) return;

        setIsSyncing(true);
        try {
            const res = await axios.post('/api/groups/sync', { groupName: selectedGroup, courseId });
            setSyncResult({
                message: res.data.message,
                matched: res.data.matched,
                total: res.data.total
            });
            fetchStudentClasses();
        } catch (err) {
            console.error("Sync failed", err);
            alert("Kunde inte synka elever.");
        } finally {
            setIsSyncing(false);
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

    const selectedGroupData = groupedStudents.find(g => g[0] === selectedGroup)?.[1] || [];

    return (
        <div className="animate-fade-in">
            {/* Import Box */}
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
                    <div className="col-8 overflow-auto d-flex flex-column" style={{ maxHeight: '500px' }}>
                        <div className="p-2 border-bottom bg-white d-flex justify-content-between align-items-center sticky-top shadow-sm">
                            <div className="fw-bold text-muted small text-uppercase">
                                Elever i {selectedGroup || '...'}
                                {selectedGroup && <span className="text-muted fw-normal ms-2">({selectedGroupData.length} st)</span>}
                            </div>
                            
                            {selectedGroup && (
                                <div className="d-flex align-items-center gap-2">
                                    <select 
                                        className="form-select form-select-sm border-primary" 
                                        style={{ width: '200px' }}
                                        value={groupMappings[selectedGroup] || ""}
                                        onChange={(e) => handleMapGroup(selectedGroup, e.target.value)}
                                    >
                                        <option value="">-- Koppla till Classroom --</option>
                                        {courses.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <button 
                                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 fw-bold"
                                        onClick={handleSyncGroup}
                                        disabled={!groupMappings[selectedGroup] || isSyncing}
                                        title="Matcha elever i listan mot Classroom"
                                    >
                                        {isSyncing ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-arrow-repeat"></i>}
                                        Matcha
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-grow-1 overflow-auto bg-white">
                            {selectedGroup ? (
                                <ul className="list-group list-group-flush">
                                    {selectedGroupData.map((student, index) => {
                                        const isTemp = String(student.google_id).startsWith('TEMP_');
                                        return (
                                            <li key={student.google_id} className="list-group-item d-flex justify-content-between align-items-center px-3 py-1 hover-bg-light transition-all" style={{ minHeight: '35px' }}>
                                                <div className="d-flex align-items-center gap-2 overflow-hidden">
                                                    <span className="text-muted small" style={{ minWidth: '20px' }}>{index + 1}.</span>
                                                    <div className={`rounded-circle border d-flex align-items-center justify-content-center flex-shrink-0 ${isTemp ? 'bg-warning bg-opacity-10 border-warning text-warning' : 'bg-success bg-opacity-10 border-success text-success'}`} style={{ width: '24px', height: '24px' }} title={isTemp ? "Ej matchad" : "Matchad"}>
                                                        <i className="bi bi-person" style={{ fontSize: '0.8rem' }}></i>
                                                    </div>
                                                    <div className="text-truncate">
                                                        <span className={`fw-bold ${isTemp ? 'text-muted' : 'text-dark'}`}>{student.student_name}</span>
                                                        <span className="student-meta">({student.class_name})</span>
                                                    </div>
                                                </div>
                                                <button className="btn btn-link text-danger p-0 opacity-25 hover-opacity-100" onClick={() => handleDeleteStudent(student.google_id)} title="Ta bort koppling">
                                                    <i className="bi bi-x-circle-fill"></i>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50 p-5">
                                    <i className="bi bi-arrow-left-circle fs-1 mb-3"></i>
                                    <p>Välj en grupp till vänster</p>
                                </div>
                            )}
                        </div>
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
                                {importPreview.isValid === false ? (
                                    <div className="p-4 text-center">
                                        <i className="bi bi-x-octagon-fill text-danger display-4 mb-3 d-block"></i>
                                        <h5 className="fw-bold text-danger">Importen kan inte genomföras</h5>
                                        <div className="alert alert-danger border-0 small mt-3">
                                            {importPreview.error}
                                        </div>
                                        <p className="text-muted small">
                                            Säkerställ att listan innehåller rubrikerna <strong>Nr</strong>, <strong>Klass</strong> och <strong>Namn</strong> samt att varje rad har data i alla kolumner.
                                        </p>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setImportPreview(null)}>Avbryt</button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary px-4 fw-bold" 
                                    onClick={confirmImport}
                                    disabled={importPreview.isValid === false || importPreview.matches.length === 0 || isImporting}
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

            {/* Sync Result Modal */}
            {syncResult && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-primary text-white border-bottom-0">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-arrow-repeat me-2"></i>
                                    Matchning klar
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSyncResult(null)}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <div className="mb-3">
                                    <i className={`bi ${syncResult.matched === syncResult.total ? 'bi-check-circle text-success' : 'bi-info-circle text-warning'} display-1`}></i>
                                </div>
                                <h4 className="fw-bold">{syncResult.message}</h4>
                                <p className="text-muted mb-0">
                                    Systemet har nu kopplat {syncResult.matched} elever till deras Google ID:n. 
                                    Deras klassnamn kommer nu att synas i Matrisen och Todo-vyn.
                                </p>
                            </div>
                            <div className="modal-footer border-top-0 bg-light">
                                <button type="button" className="btn btn-primary px-5 fw-bold" onClick={() => setSyncResult(null)}>Stäng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentRegistry;