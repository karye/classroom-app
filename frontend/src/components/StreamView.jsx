import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, getISOWeek, isSameDay, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { dbGet, dbSet } from '../db';

// Components
import CalendarSidebar from './stream/CalendarSidebar';
import Feed from './stream/Feed';
import LoadingSpinner from './common/LoadingSpinner';
import EmptyState from './common/EmptyState';
import ExportPreviewModal from './common/ExportPreviewModal';

const StreamView = ({ 
    courseId, 
    currentCourseData: data, 
    allNotes: notes,
    onUpdateNote,
    onSync, 
    loading, 
    onUpdate 
}) => {
    const [announcements, setAnnouncements] = useState([]);
    const [error, setError] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [tempNoteContent, setTempNoteContent] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [expandedPosts, setExpandedPosts] = useState({});
    const [selectedDate, setSelectedDate] = useState(undefined);
    const [filterText, setFilterText] = useState('');

    // Export State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportContent, setExportContent] = useState('');
    const [exportFilename, setExportFilename] = useState('');

    // Sync announcements from central data
    useEffect(() => {
        if (data?.announcements) {
            setAnnouncements(data.announcements);
        }
    }, [data]);

    const handleSaveNote = async (postId, content) => {
        setSavingNote(true);
        try {
            await axios.post('/api/notes', {
                courseId,
                postId,
                content
            });
            onUpdateNote(postId, content); // Update central state in App.jsx
            setEditingNoteId(null);
        } catch (err) {
            console.error("Save error:", err);
            alert("Kunde inte spara anteckning.");
        } finally {
            setSavingNote(false);
        }
    };

    const handleGenerateLogbook = () => {
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

        const content = lines.join('\n');
        setExportContent(content);
        setExportFilename(`loggbok_${new Date().toISOString().split('T')[0]}.md`);
        setShowExportModal(true);
    };

    const togglePost = (postId) => {
        setExpandedPosts(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    const handleStartEdit = (postId, content) => {
        setEditingNoteId(postId);
        setTempNoteContent(content || "");
    };

    const handleSaveWrapper = (postId) => {
        handleSaveNote(postId, tempNoteContent);
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

    if (announcements.length === 0) {
        return (
            <EmptyState 
                icon="bi-chat-square-text"
                title="Inget att visa nu"
                message={`Ingen data hittades för kursen. Klicka på knappen för att hämta kursflöde och inlägg från Google Classroom.`}
                onRefresh={onSync}
                isRefreshing={loading}
            />
        );
    }

    if (error) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                <i className="bi bi-exclamation-circle fs-1 mb-2"></i>
                <p>{error}</p>
                <button className="btn btn-outline-primary btn-sm" onClick={() => fetchStreamData(courseId, true)}>Försök igen</button>
            </div>
        );
    }

    // Filter logic
    const filteredAnnouncements = announcements.filter(post => {
        if (selectedDate && !isSameDay(parseISO(post.updateTime), selectedDate)) return false;
        
        // Search in text
        const contentMatch = (post.text || '').toLowerCase().includes(filterText.toLowerCase());
        
        if (filterText && !contentMatch) return false;
        return true;
    });

    // Days with posts for calendar highlighting
    const daysWithPosts = announcements.map(post => parseISO(post.updateTime));

    return (
        <div className="d-flex flex-column h-100">
            {/* Export Modal */}
            {showExportModal && (
                <ExportPreviewModal 
                    title="Exportera Loggbok (Markdown)"
                    content={exportContent}
                    filename={exportFilename}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {/* Toolbar */}
            <div className="bg-white border-bottom px-4 py-1 d-flex align-items-center shadow-sm" style={{ minHeight: '45px', zIndex: 5 }}>
                <div className="d-flex align-items-center w-100 justify-content-between">
                     <div className="d-flex align-items-center gap-3">
                        <div className="input-group input-group-sm" style={{ width: '200px' }}>
                             <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                             <input type="text" className="form-control border-start-0 ps-0" placeholder="Filtrera inlägg..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                        </div>
                     </div>
                    <button onClick={handleGenerateLogbook} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold" title="Exportera loggbok och anteckningar till Markdown (.md)">
                        <i className="bi bi-file-text fs-6"></i> Exportera
                    </button>
                </div>
            </div>

            <div className={`container-fluid flex-grow-1 overflow-hidden ${loading ? 'opacity-50' : ''}`} style={{ transition: 'opacity 0.2s' }}>
                <div className="row h-100 flex-nowrap">
                    <CalendarSidebar 
                        selectedDate={selectedDate} 
                        setSelectedDate={setSelectedDate} 
                        daysWithPosts={daysWithPosts} 
                    />
                    
                    <Feed 
                        filteredAnnouncements={filteredAnnouncements}
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        notes={notes}
                        expandedPosts={expandedPosts}
                        togglePost={togglePost}
                        editingNoteId={editingNoteId}
                        setEditingNoteId={setEditingNoteId}
                        tempNoteContent={tempNoteContent}
                        setTempNoteContent={setTempNoteContent}
                        savingNote={savingNote}
                        handleSaveWrapper={handleSaveWrapper}
                        handleStartEdit={handleStartEdit}
                        renderMaterialCompact={renderMaterialCompact}
                    />
                </div>
            </div>
        </div>
    );
};

export default StreamView;
