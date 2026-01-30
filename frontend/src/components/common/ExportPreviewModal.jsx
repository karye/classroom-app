import React, { useState } from 'react';

const ExportPreviewModal = ({ title, content, filename, onClose }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        onClose();
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="student-summary-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
            <div className="student-summary-content d-flex flex-column" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', height: '90vh' }}>
                <div className="student-summary-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold text-dark d-flex align-items-center">
                        <i className="bi bi-file-text me-2 text-primary"></i>
                        {title}
                    </h5>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={handleCopy}>
                            {copySuccess ? <i className="bi bi-check-lg"></i> : <i className="bi bi-clipboard"></i>}
                            {copySuccess ? 'Kopierad' : 'Kopiera'}
                        </button>
                        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleDownload}>
                            <i className="bi bi-download"></i> Ladda ner
                        </button>
                        <button className="btn btn-light" onClick={onClose}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
                
                <div className="student-summary-body p-0 d-flex flex-column flex-grow-1" style={{ overflow: 'hidden' }}>
                    <div className="p-3 bg-light border-bottom small text-muted">
                        Kontrollera innehållet nedan innan du sparar.
                    </div>
                    <textarea 
                        className="form-control border-0 rounded-0 flex-grow-1 font-monospace p-3" 
                        style={{ resize: 'none', fontSize: '0.8rem', backgroundColor: '#f8f9fa' }}
                        value={content}
                        readOnly
                    />
                </div>
            </div>
        </div>
    );
};

export default ExportPreviewModal;
