import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { format, getISOWeek, isSameDay, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const StreamView = ({ announcements, notes, loading, error, onRefresh, onSaveNote, courseId }) => {
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [tempNoteContent, setTempNoteContent] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [expandedPosts, setExpandedPosts] = useState({});
    const [selectedDate, setSelectedDate] = useState(undefined);

    const togglePost = (postId) => {
        setExpandedPosts(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    const handleStartEdit = (postId, existingContent) => {
        setEditingNoteId(postId);
        setTempNoteContent(existingContent || "");
        if (!expandedPosts[postId]) {
            togglePost(postId);
        }
    };

    const handleSaveWrapper = async (postId) => {
        setSavingNote(true);
        try {
            await onSaveNote(postId, tempNoteContent);
            setEditingNoteId(null);
        } catch (err) {
            console.error("Save error:", err);
            alert("Kunde inte spara anteckning.");
        } finally {
            setSavingNote(false);
        }
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
                <div className="spinner-border text-primary" role="status"></div>
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
        <div className="container-fluid h-100">
            <style>{`
                .rdp { 
                    --rdp-cell-size: 100%; 
                    margin: 0; 
                    width: 100%;
                }
                .rdp-table {
                    max-width: 100%;
                    width: 100%;
                }
                .rdp-day {
                    width: 100%;
                    aspect-ratio: 1;
                    max-width: 40px;
                    max-height: 40px;
                    margin: auto;
                }
                .rdp-day_has_post::after {
                    content: '';
                    position: absolute;
                    bottom: 3px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 4px;
                    height: 4px;
                    background-color: var(--bs-primary);
                    border-radius: 50%;
                }
                @media (max-width: 768px) {
                    .rdp { --rdp-cell-size: 30px; }
                }
            `}</style>
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
    );
};

export default StreamView;
