import React from 'react';
import ReactMarkdown from 'react-markdown';
import { format, getISOWeek, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

const PostCard = ({ 
    post, 
    notes, 
    isExpanded, 
    togglePost, 
    editingNoteId, 
    setEditingNoteId, 
    tempNoteContent, 
    setTempNoteContent, 
    savingNote, 
    handleSaveWrapper, 
    handleStartEdit,
    showMonthHeader,
    currentMonth,
    selectedDate,
    renderMaterialCompact
}) => {
    const hasNotes = !!notes[post.id];
    const hasMaterials = post.materials && post.materials.length > 0;
    const isScheduled = post.state === 'DRAFT' && post.scheduledTime;
    const displayDate = isScheduled ? parseISO(post.scheduledTime) : parseISO(post.updateTime);
    const postDate = parseISO(post.updateTime); // Keep for month headers etc if needed

    return (
        <React.Fragment>
            {showMonthHeader && !selectedDate && (
                <div className="d-flex align-items-center my-4 opacity-75">
                    <div className="flex-grow-1 border-bottom"></div>
                    <span className="mx-3 fw-bold text-primary small" style={{ letterSpacing: '1px' }}>{currentMonth}</span>
                    <div className="flex-grow-1 border-bottom"></div>
                </div>
            )}
            <div className={`card mb-3 shadow-sm border-0 ${isScheduled ? 'border-start border-warning border-4' : ''}`}>
                <div className={`card-header bg-white border-bottom-0 pt-3 px-4 d-flex justify-content-between align-items-start ${!isExpanded ? 'pb-2' : ''}`} style={{cursor: 'pointer'}} onClick={() => togglePost(post.id)} title={isExpanded ? "Klicka för att minimera" : "Klicka för att läsa mer"}>
                    <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
                        <div className={`bg-light text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${!isExpanded ? 'border' : ''}`} style={{width: '32px', height: '32px'}}>
                            <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25" title="Vecka">v.{getISOWeek(displayDate)}</span>
                                <small className={`${isScheduled ? 'text-warning' : 'text-muted'} fw-bold`} style={{fontSize: '0.75rem'}} title={format(displayDate, "yyyy-MM-dd HH:mm")}>
                                    {isScheduled ? <i className="bi bi-clock me-1"></i> : null}
                                    {format(displayDate, "d MMM yyyy HH:mm", { locale: sv })}
                                </small>
                                {isScheduled && <span className="badge bg-warning text-dark border-0 small">Schemalagd</span>}
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
                            <h6 className="text-muted small fw-bold mb-2">Material</h6>
                            <div className="d-flex flex-wrap gap-2">
                                {post.materials.map((mat, idx) => renderMaterialCompact(mat, idx))}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 bg-light p-3 rounded border-start border-3 border-primary bg-opacity-10">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="small text-primary fw-bold mb-0">
                                <i className="bi bi-journal-text me-2"></i>Loggbok (Markdown)
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
};

export default PostCard;
