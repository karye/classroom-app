import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { format, getISOWeek, isSameDay, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { dbGet, dbSet } from '../db';

const StreamView = ({ courseId, refreshTrigger, onUpdate, onLoading }) => {
    const [announcements, setAnnouncements] = useState([]);
    const [notes, setNotes] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [tempNoteContent, setTempNoteContent] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [expandedPosts, setExpandedPosts] = useState({});
    const [selectedDate, setSelectedDate] = useState(undefined);

    const setLocalLoading = (val) => {
        setLoading(val);
        if (onLoading) onLoading(val);
    };

    // Load from cache or fetch
    useEffect(() => {
        const loadCache = async () => {
            if (!courseId) return;
            setLocalLoading(true);
            try {
                const cacheKey = `stream_cache_${courseId}`;
                const cached = await dbGet(cacheKey);
                
                // Fetch notes (fast from DB)
                const notesRes = await axios.get(`/api/notes/${courseId}`);
                setNotes(notesRes.data);

                if (cached) {
                    setAnnouncements(cached.data);
                } else {
                    await fetchStreamData(courseId);
                }
            } catch (err) {
                console.warn("Stream cache load failed", err);
                await fetchStreamData(courseId);
            } finally {
                setLocalLoading(false);
            }
        };
        loadCache();
    }, [courseId]);

    // Manual refresh
    useEffect(() => {
        if (refreshTrigger > 0 && courseId) {
            fetchStreamData(courseId, true);
        }
    }, [refreshTrigger]);

    const fetchStreamData = async (id, force = false) => {
        if (!id) return;
        if (force) setLocalLoading(true);
        setError(null);
        try {
            const [annRes, notesRes] = await Promise.all([
                axios.get(`/api/courses/${id}/announcements`),
                axios.get(`/api/notes/${id}`)
            ]);
            setAnnouncements(annRes.data);
            setNotes(notesRes.data);
            
            const now = Date.now();
            if (onUpdate) onUpdate(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            await dbSet(`stream_cache_${id}`, {
                timestamp: now,
                data: annRes.data
            });
        } catch (err) {
            console.error("Failed to fetch stream data", err);
            setError("Kunde inte hämta inlägg.");
        } finally {
            if (force) setLocalLoading(false);
        }
    };

    const handleSaveNote = async (postId, content) => {
        setSavingNote(true);
        try {
            await axios.post('/api/notes', {
                courseId,
                postId,
                content
            });
            setNotes(prev => ({ ...prev, [postId]: content }));
            setEditingNoteId(null);
        } catch (err) {
            console.error("Save error:", err);
            alert("Kunde inte spara anteckning.");
        } finally {
            setSavingNote(false);
        }
    };

    const handleExportLogbook = () => {
        const lines = [];
        lines.push(`# Loggbok`);
        lines.push(`Exporterad: ${new Date().toLocaleDateString('sv-SE')}\n`);

        announcements.forEach(post => {
            const postDate = parseISO(post.updateTime);
            const dateStr = format(postDate, "yyyy-MM-dd HH:mm", { locale: sv });
            const weekStr = getISOWeek(postDate);
            
            lines.push(`## ${dateStr} (v.${weekStr})`);
            lines.push(`**Classroom:**\n${post.text || '(Ingen text)'}\n`);
            
            if (post.materials && post.materials.length > 0) {
                 lines.push(`*Material:* ${post.materials.map(m => {
                     if (m.driveFile) return `[Drive] ${m.driveFile.driveFile.title}`;
                     if (m.link) return `[Länk] ${m.link.title}`;
                     if (m.youtubeVideo) return `[Video] ${m.youtubeVideo.title}`;
                     return 'Fil';
                 }).join(', ')}\n`);
            }

            if (notes[post.id]) {
                lines.push(`\n**Mina Anteckningar:**\n${notes[post.id]}\n`);
            }
            lines.push('---\n');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `loggbok_${new Date().toISOString().split('T')[0]}.md`;
        link.click();
    };

    const renderMaterialCompact = (material, idx) => {
        let icon = "bi-file-earmark";
        let color = "text-secondary";
        let title = "Fil";
        let link = "#";

        if (material.driveFile) {
            icon = "bi-google"; color = "text-success"; title = material.driveFile.driveFile.title; link = material.driveFile.driveFile.alternateLink;
        } else if (material.youtubeVideo) {
            icon = "bi-youtube"; color = "text-danger"; title = material.youtubeVideo.title; link = material.youtubeVideo.alternateLink;
        } else if (material.link) {
            icon = "bi-link-45deg"; color = "text-primary"; title = material.link.title || material.link.url; link = material.link.url;
        }

        return (
            <a key={idx} href={link} target="_blank" rel="noreferrer" className="badge bg-light text-dark text-decoration-none border d-flex align-items-center gap-1 fw-normal px-2 py-1" style={{maxWidth: '200px'}} title={title}>
                <i className={`bi ${icon} ${color}`}></i>
                <span className="text-truncate d-inline-block" style={{maxWidth: '150px'}}>{title}</span>
            </a>
        );
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center h-100">
                <i className="bi bi-arrow-clockwise spin text-primary" style={{ fontSize: '3rem' }}></i>
            </div>
        );
    }

    if (error) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                <i className="bi bi-exclamation-circle fs-1 mb-2"></i>
                <p>{error}</p>
                <button className="btn btn-outline-primary btn-sm" onClick={onRefresh}>Försök igen</button>
            </div>
        );
    }

    // Filter logic
    const filteredAnnouncements = selectedDate 
        ? announcements.filter(post => isSameDay(parseISO(post.updateTime), selectedDate))
        : announcements;

    // Days with posts for calendar highlighting
    const daysWithPosts = announcements.map(post => parseISO(post.updateTime));

    let lastMonth = null;

    return (
        <div className="d-flex flex-column h-100">
            {/* Toolbar */}
            <div className="bg-white border-bottom px-4 py-1 d-flex align-items-center shadow-sm" style={{ minHeight: '45px', zIndex: 5 }}>
                <div className="d-flex align-items-center w-100 justify-content-end">
                    <button onClick={handleExportLogbook} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold">
                        <i className="bi bi-file-text fs-6"></i> Exportera Loggbok
                    </button>
                </div>
            </div>

            <div className="container-fluid flex-grow-1 overflow-hidden">
                <div className="row h-100">
                {/* Calendar Sidebar */}
                <div className="col-md-3 col-lg-3 border-end bg-light p-3 h-100 d-none d-md-block overflow-auto">
                    <div className="bg-white rounded shadow-sm p-2 mb-3 d-flex justify-content-center overflow-hidden">
                        <div style={{ maxWidth: '100%' }}>
                            <DayPicker
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                modifiers={{ has_post: daysWithPosts }}
                                modifiersClassNames={{ has_post: 'rdp-day_has_post position-relative' }}
                                locale={sv}
                                weekStartsOn={1}
                                showOutsideDays
                                showWeekNumber
                            />
                        </div>
                    </div>
                    {selectedDate && (
                        <button className="btn btn-outline-secondary w-100 btn-sm mb-3" onClick={() => setSelectedDate(undefined)} title="Rensa datumfilter">
                            <i className="bi bi-x-circle me-2"></i>Visa alla inlägg
                        </button>
                    )}
                    <div className="text-muted small px-2">
                        <p className="mb-1"><i className="bi bi-info-circle me-1"></i>Blå prick = inlägg finns.</p>
                        <p className="mb-0"><i className="bi bi-calendar-event me-1"></i>Veckonummer visas till vänster.</p>
                    </div>
                </div>

                {/* Main Feed */}
                <div className="col-md-9 col-lg-9 p-0 h-100 overflow-auto bg-white">
                    <div className="container py-4" style={{ maxWidth: '800px' }}>
                        {filteredAnnouncements.length === 0 ? (
                             <div className="text-center text-muted mt-5">
                                 <i className="bi bi-calendar-x fs-1 opacity-25"></i>
                                 <p className="mt-2">Inga inlägg hittades {selectedDate ? 'för detta datum' : ''}.</p>
                                 {selectedDate && <button className="btn btn-link" onClick={() => setSelectedDate(undefined)}>Visa alla</button>}
                             </div>
                        ) : (
                        filteredAnnouncements.map((post) => {
                            const isExpanded = expandedPosts[post.id];
                            const hasNotes = !!notes[post.id];
                            const hasMaterials = post.materials && post.materials.length > 0;
                            const postDate = parseISO(post.updateTime);
                            
                            // Month grouping logic
                            const currentMonth = format(postDate, "MMMM yyyy", { locale: sv }).toUpperCase();
                            const showMonthHeader = currentMonth !== lastMonth;
                            lastMonth = currentMonth;

                            return (
                            <React.Fragment key={post.id}>
                                {showMonthHeader && !selectedDate && (
                                    <div className="d-flex align-items-center my-4 opacity-75">
                                        <div className="flex-grow-1 border-bottom"></div>
                                        <span className="mx-3 fw-bold text-primary small" style={{ letterSpacing: '1px' }}>{currentMonth}</span>
                                        <div className="flex-grow-1 border-bottom"></div>
                                    </div>
                                )}
                                <div className="card mb-3 shadow-sm border-0">
                                <div className={`card-header bg-white border-bottom-0 pt-3 px-4 d-flex justify-content-between align-items-start ${!isExpanded ? 'pb-2' : ''}`} style={{cursor: 'pointer'}} onClick={() => togglePost(post.id)} title={isExpanded ? "Klicka för att minimera" : "Klicka för att läsa mer"}>
                                    <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                                        <div className={`bg-light text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${!isExpanded ? 'border' : ''}`} style={{width: '32px', height: '32px'}}>
                                            <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" title="Vecka">v.{getISOWeek(postDate)}</span>
                                                <small className="text-muted fw-bold" style={{fontSize: '0.75rem'}} title={format(postDate, "yyyy-MM-dd HH:mm")}>
                                                    {format(postDate, "d MMM yyyy HH:mm", { locale: sv })}
                                                </small>
                                                {hasNotes && <i className="bi bi-journal-check text-warning" title="Har anteckning"></i>}
                                                {hasMaterials && <i className="bi bi-paperclip text-secondary opacity-50" title="Har bifogat material"></i>}
                                            </div>
                                            {!isExpanded && (
                                                <div className="text-muted small mt-1" style={{ 
                                                    display: '-webkit-box', 
                                                    WebkitLineClamp: '3', 
                                                    WebkitBoxOrient: 'vertical', 
                                                    overflow: 'hidden',
                                                    lineHeight: '1.3'
                                                }}>
                                                    {post.text}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <a href={post.alternateLink} target="_blank" rel="noreferrer" className="text-muted ms-2" title="Öppna i Classroom" onClick={(e) => e.stopPropagation()}><i className="bi bi-box-arrow-up-right small"></i></a>
                                </div>
                                
                                {isExpanded && (
                                <div className="card-body px-4 pt-0">
                                    <hr className="my-2 opacity-10" />
                                    
                                    <div className="card-text mt-3 text-dark" style={{whiteSpace: 'pre-wrap'}}>
                                        <ReactMarkdown>{post.text}</ReactMarkdown>
                                    </div>
                                    
                                    {hasMaterials && (
                                        <div className="mt-4 mb-3">
                                            <h6 className="text-muted small fw-bold mb-2">MATERIAL</h6>
                                            <div className="d-flex flex-wrap gap-2">
                                                {post.materials.map((mat, idx) => renderMaterialCompact(mat, idx))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 bg-light p-3 rounded border-start border-3 border-primary bg-opacity-10">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <h6 className="small text-primary fw-bold mb-0">
                                                <i className="bi bi-journal-text me-2"></i>LOGGBOK (Markdown)
                                            </h6>
                                            {editingNoteId !== post.id && (
                                                <button 
                                                    onClick={() => handleStartEdit(post.id, notes[post.id])} 
                                                    className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
                                                >
                                                    <i className="bi bi-pencil me-1"></i> {notes[post.id] ? 'Redigera' : 'Skriv'}
                                                </button>
                                            )}
                                        </div>

                                        {editingNoteId === post.id ? (
                                            <div className="mt-2">
                                                <textarea 
                                                    className="form-control form-control-sm mb-2 font-monospace"
                                                    rows="6" 
                                                    placeholder="Stödjer **fetstil**, *kursiv*, - listor..."
                                                    value={tempNoteContent}
                                                    onChange={(e) => setTempNoteContent(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="d-flex gap-2 justify-content-end align-items-center">
                                                    <small className="text-muted me-auto">Markdown stöds</small>
                                                    <button 
                                                        className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => setEditingNoteId(null)}
                                                        disabled={savingNote}
                                                    > Avbryt </button>
                                                    <button 
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() => handleSaveWrapper(post.id)}
                                                        disabled={savingNote}
                                                    >
                                                        {savingNote ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                                                        Spara
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            notes[post.id] ? (
                                                <div className="text-dark small markdown-preview">
                                                    <ReactMarkdown>{notes[post.id]}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="text-muted small fst-italic py-1" onClick={() => handleStartEdit(post.id, "")} style={{ cursor: 'pointer' }}>
                                                    Klicka för att lägga till en anteckning...
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                                )}
                            </div>
                            </React.Fragment>
                            );
                        })
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default StreamView;
