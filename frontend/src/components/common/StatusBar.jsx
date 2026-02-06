import React from 'react';

const StatusBar = ({ status }) => {
    const active = status?.active;
    const message = status?.message || 'Redo';
    const type = status?.type || 'info';

    let bgClass = "bg-dark text-white-50";
    let icon = "bi-info-circle";
    
    if (active) {
        bgClass = "bg-primary text-white";
        icon = "bi-arrow-repeat spin";
    } else if (type === 'success') {
        bgClass = "bg-success text-white";
        icon = "bi-check-lg";
    } else if (type === 'error') {
        bgClass = "bg-danger text-white";
        icon = "bi-exclamation-triangle-fill";
    }

    return (
        <div className={`${bgClass} px-3 border-top d-flex align-items-center justify-content-between shadow-lg`} style={{ height: '24px', fontSize: '0.7rem', transition: 'all 0.3s ease', zIndex: 1000 }}>
            <div className="d-flex align-items-center gap-3 overflow-hidden w-100">
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <i className={`bi ${icon}`}></i>
                    <span className="fw-bold" style={{ letterSpacing: '0.03rem', opacity: 0.8 }}>
                        {active ? 'Synkroniserar' : 'Status'}
                    </span>
                </div>
                <div className="vr opacity-25 h-75"></div>
                <div className="text-truncate">
                    {message}
                </div>
            </div>
            
            {active && (
                <div className="progress flex-shrink-0" style={{ width: '60px', height: '3px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <div className="progress-bar progress-bar-striped progress-bar-animated bg-white w-100"></div>
                </div>
            )}
        </div>
    );
};

export default StatusBar;
