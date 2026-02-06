import React from 'react';

const MatrixToolbar = ({ 
    filterText, setFilterText, 
    assignmentFilter, setAssignmentFilter,
    hideNoDeadline, setHideNoDeadline,
    showHeatmap, setShowHeatmap,
    sortType, setSortType,
    onExport 
}) => {
    return (
        <div className="bg-white border-bottom px-4 py-1 d-flex align-items-center shadow-sm" style={{ minHeight: '45px', zIndex: 5 }}>
            <div className="d-flex align-items-center w-100 justify-content-between">
                <div className="d-flex align-items-center gap-3">
                    {/* Search */}
                    <div className="input-group input-group-sm" style={{ width: '200px' }}>
                         <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                         <input type="text" className="form-control border-start-0 ps-0" placeholder="Filtrera uppgifter..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                    </div>
                    
                    <div className="vr h-50 opacity-25"></div>

                    {/* Assignment Filter */}
                    <div className="d-flex align-items-center gap-2">
                         <i className="bi bi-funnel text-muted"></i>
                         <select 
                            onChange={(e) => setAssignmentFilter(e.target.value)} 
                            value={assignmentFilter} 
                            className="form-select form-select-sm border-0 fw-bold text-dark bg-transparent ps-0" 
                            style={{ width: 'auto', cursor: 'pointer', boxShadow: 'none' }}
                         >
                            <option value="all">Alla uppgifter</option>
                            <option value="cat-prov">Visa: prov</option>
                            <option value="cat-uppgifter">Visa: uppgifter</option>
                            <option value="cat-none">Visa: övningar (ingen kategori)</option>
                         </select>
                    </div>

                    <div className="vr h-50 opacity-25"></div>

                    {/* Options */}
                    <div className="d-flex align-items-center gap-3">
                         <div className="form-check form-check-inline m-0">
                             <input className="form-check-input" type="checkbox" id="checkDeadline" checked={hideNoDeadline} onChange={e => setHideNoDeadline(e.target.checked)} />
                             <label className="form-check-label small fw-bold" htmlFor="checkDeadline">Deadline</label>
                         </div>
                         <div className="form-check form-check-inline m-0">
                             <input className="form-check-input" type="checkbox" id="checkHeatmap" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
                             <label className="form-check-label small fw-bold text-success" htmlFor="checkHeatmap">Heatmap</label>
                         </div>
                    </div>

                    <div className="vr h-50 opacity-25"></div>

                    {/* Sorting */}
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-sort-down text-muted"></i>
                        <select onChange={(e) => setSortType(e.target.value)} value={sortType} className="form-select form-select-sm border-0 fw-bold text-dark bg-transparent ps-0" style={{ width: 'auto', cursor: 'pointer', boxShadow: 'none' }}>
                            <option value="name-asc">Sortera: a–ö</option>
                            <option value="name-desc">Sortera: ö–a</option>
                            <option value="perf-struggle">Sortera: varning</option>
                            <option value="perf-top">Sortera: bäst</option>
                            <option value="submission-desc">Sortera: mest gjort</option>
                        </select>
                    </div>
                </div>

                {/* Export */}
                <button onClick={onExport} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold">
                    <i className="bi bi-file-earmark-spreadsheet fs-6"></i> Exportera excel
                </button>
            </div>
        </div>
    );
};

export default MatrixToolbar;
