import React from 'react';

const EmptyState = ({ icon = "bi-cloud-download", title = "Ingen data hittades", message = "Klicka på uppdateringsknappen för att hämta data från Google Classroom.", isRefreshing, onRefresh }) => (
    <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100 text-muted p-5 text-center animate-fade-in">
        <div className="bg-light rounded-circle p-4 mb-3">
            <i className={`bi ${icon} display-4 opacity-50`}></i>
        </div>
        <h4 className="fw-bold text-dark">{title}</h4>
        <p className="small mb-4 mx-auto" style={{ maxWidth: '350px' }}>
            {message}
        </p>
        {!isRefreshing && onRefresh && (
            <button className="btn btn-primary px-4 rounded-pill fw-bold shadow-sm" onClick={onRefresh}>
                <i className="bi bi-arrow-clockwise me-2"></i>Hämta nu
            </button>
        )}
    </div>
);

export default EmptyState;