import React from 'react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import PostCard from './PostCard';

const Feed = ({ 
    filteredAnnouncements, 
    selectedDate, 
    setSelectedDate, 
    notes, 
    expandedPosts, 
    togglePost, 
    editingNoteId, 
    setEditingNoteId, 
    tempNoteContent, 
    setTempNoteContent, 
    savingNote, 
    handleSaveWrapper, 
    handleStartEdit,
    renderMaterialCompact 
}) => {
    let lastMonth = null;

    return (
        <div className="flex-grow-1 p-0 h-100 overflow-auto bg-white">
            <div className="py-4 px-5" style={{ maxWidth: '900px' }}>
                {filteredAnnouncements.length === 0 ? (
                        <div className="text-center text-muted mt-5">
                            <i className="bi bi-calendar-x fs-1 opacity-25"></i>
                            <p className="mt-2">Inga inlägg hittades {selectedDate ? 'för detta datum' : ''}.</p>
                            {selectedDate && <button className="btn btn-link" onClick={() => setSelectedDate(undefined)}>Visa alla</button>}
                        </div>
                ) : (
                    filteredAnnouncements.map((post) => {
                        const postDate = parseISO(post.updateTime);
                        const currentMonth = format(postDate, "MMMM yyyy", { locale: sv }).toUpperCase();
                        const showMonthHeader = currentMonth !== lastMonth;
                        lastMonth = currentMonth;

                        return (
                            <PostCard 
                                key={post.id}
                                post={post}
                                notes={notes}
                                isExpanded={expandedPosts[post.id]}
                                togglePost={togglePost}
                                editingNoteId={editingNoteId}
                                setEditingNoteId={setEditingNoteId}
                                tempNoteContent={tempNoteContent}
                                setTempNoteContent={setTempNoteContent}
                                savingNote={savingNote}
                                handleSaveWrapper={handleSaveWrapper}
                                handleStartEdit={handleStartEdit}
                                showMonthHeader={showMonthHeader}
                                currentMonth={currentMonth}
                                selectedDate={selectedDate}
                                renderMaterialCompact={renderMaterialCompact}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Feed;
