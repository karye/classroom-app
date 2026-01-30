import React from 'react';

const ErrorState = ({ error, onRetry }) => (
    <div className="p-4 text-center text-danger w-100 mt-5">
        <i className="bi bi-exclamation-triangle me-2"></i>{error}
        <button className="btn btn-link btn-sm" onClick={onRetry}>Försök igen</button>
    </div>
);

export default ErrorState;
