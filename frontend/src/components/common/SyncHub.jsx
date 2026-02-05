import React, { useEffect, useState } from 'react';

const SyncHub = ({ status }) => {
    // status: { active: boolean, message: string, type: 'info'|'success'|'error' }
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (status.active) {
            setVisible(true);
        } else if (status.type === 'success' || status.type === 'error') {
            // Show result message briefly
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [status.active, status.type, status.message]);

    if (!visible) return null;

    let icon = "bi-arrow-repeat";
    let colorClass = "bg-dark text-white";

    if (status.type === 'success') {
        icon = "bi-check-circle-fill";
        colorClass = "bg-success text-white";
    } else if (status.type === 'error') {
        icon = "bi-exclamation-triangle-fill";
        colorClass = "bg-danger text-white";
    }

    return (
        <div 
            className={`position-fixed bottom-0 end-0 m-4 p-3 rounded shadow-lg d-flex align-items-center gap-3 ${colorClass}`} 
            style={{ 
                zIndex: 9999, 
                minWidth: '320px', 
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
            }}
        >
            <div className="fs-4 d-flex align-items-center">
                <i className={`bi ${icon} ${status.type === 'info' ? 'spin' : ''}`}></i>
            </div>
            <div className="flex-grow-1 overflow-hidden">
                <div className="fw-bold small text-truncate">{status.message || 'Laddar...'}</div>
                {status.type === 'info' && (
                    <div className="progress mt-2" style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        <div className="progress-bar progress-bar-striped progress-bar-animated bg-white w-100" role="progressbar"></div>
                    </div>
                )}
            </div>
            <button className="btn btn-link text-white p-0 opacity-50 hover-opacity-100" onClick={() => setVisible(false)}>
                <i className="bi bi-x-lg"></i>
            </button>
        </div>
    );
};

export default SyncHub;
