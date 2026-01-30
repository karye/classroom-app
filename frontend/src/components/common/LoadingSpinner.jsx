import React from 'react';

const LoadingSpinner = () => (
    <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <i className="bi bi-arrow-clockwise spin text-primary" style={{ fontSize: '3rem' }}></i>
    </div>
);

export default LoadingSpinner;
