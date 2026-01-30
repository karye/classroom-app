import React from 'react';

const EmptyState = ({ isRefreshing, onRefresh }) => (
    <div className="d-flex flex-column justify-content-center align-items-center w-100 h-100 text-muted">
        {isRefreshing ? 
            <div className="spinner-border text-secondary mb-3" role="status"></div> : 
            <i className="bi bi-check2-circle fs-1 opacity-25 mb-2"></i>
        }
        <p>Inga uppgifter att rätta!</p>
        {!isRefreshing && <button className="btn btn-outline-secondary btn-sm" onClick={onRefresh}>Uppdatera</button>}
    </div>
);

export default EmptyState;
