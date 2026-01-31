import React from 'react';

const StatusBadge = ({ status, late, className = '', style = {} }) => {
    const baseStyle = { 
        fontSize: '0.6rem', 
        padding: '1px 4px', 
        lineHeight: '1.2',
        display: 'inline-flex',
        alignItems: 'center',
        ...style 
    };
    
    // Status: TURNED_IN (Inlämnad)
    if (status === 'TURNED_IN') {
        return (
            <div className="d-inline-flex flex-wrap gap-1 align-items-center">
                <span className={`badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 fw-normal ${className}`} style={baseStyle}>
                    <i className="bi bi-check2 me-1" style={{ fontSize: '0.65rem' }}></i>Inlämnad
                </span>
                {late && (
                    <span className={`badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 fw-normal ${className}`} style={baseStyle}>
                        <i className="bi bi-clock-history me-1" style={{ fontSize: '0.6rem' }}></i>Sen
                    </span>
                )}
            </div>
        );
    }

    // Status: RETURNED (Klar)
    if (status === 'RETURNED') {
        return (
            <span className={`badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 fw-normal ${className}`} style={baseStyle}>
                <i className="bi bi-check-all me-1" style={{ fontSize: '0.7rem' }}></i>Klar
            </span>
        );
    }

    // Status: NEW / CREATED (Ej inlämnad)
    if (status === 'CREATED' || status === 'NEW') {
        return (
            <span className={`badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 fw-normal ${className}`} style={baseStyle}>
                <i className="bi bi-dash me-1" style={{ fontSize: '0.7rem' }}></i>Ej inlämnad
            </span>
        );
    }

    // Status: RECLAIMED (Återtaget)
    if (status === 'RECLAIMED_BY_STUDENT') {
        return (
            <span className={`badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 fw-normal ${className}`} style={baseStyle}>
                <i className="bi bi-arrow-counterclockwise me-1" style={{ fontSize: '0.6rem' }}></i>Återtaget
            </span>
        );
    }

    return null;
};

export default StatusBadge;
