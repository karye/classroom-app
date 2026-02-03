import React from 'react';

const TodoToolbar = ({ sortType, setSortType, hideEmptyAssignments, setHideEmptyAssignments, assignmentFilter, setAssignmentFilter, filterText, setFilterText }) => {
    return (
        <div className="bg-white border-bottom px-4 py-1 d-flex align-items-center shadow-sm" style={{ minHeight: '45px', zIndex: 5 }}>
            <div className="d-flex align-items-center w-100 justify-content-between">
                <div className="d-flex align-items-center gap-3 w-100">
                    {/* Search */}
                    <div className="input-group input-group-sm" style={{ maxWidth: '200px' }}>
                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                        <input 
                            type="text" 
                            className="form-control border-start-0 ps-0" 
                            placeholder="Filtrera uppgifter..." 
                            value={filterText} 
                            onChange={(e) => setFilterText(e.target.value)} 
                        />
                    </div>

                    <div className="vr h-50 opacity-25"></div>

                    {/* Filter Type Dropdown */}
                    <div className="d-flex align-items-center gap-2">
                             <i className="bi bi-funnel text-muted"></i>
                             <select 
                                onChange={(e) => setAssignmentFilter(e.target.value)} 
                                value={assignmentFilter} 
                                className="form-select form-select-sm border-0 fw-bold text-dark bg-transparent ps-0" 
                                style={{ width: 'auto', cursor: 'pointer', boxShadow: 'none' }}
                             >
                                <option value="all">Visa: Allt att rätta</option>
                                <option value="ungraded">Visa: Uppgifter (Ej prov)</option>
                                <option value="graded">Visa: Prov & Bedömning</option>
                             </select>
                    </div>

                    <div className="vr h-50 opacity-25"></div>

                    {/* Sort */}
                    <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-sort-down text-muted"></i>
                            <select className="form-select form-select-sm border-0 fw-bold text-dark bg-transparent ps-0" style={{ width: 'auto', cursor: 'pointer', boxShadow: 'none' }} value={sortType} onChange={(e) => setSortType(e.target.value)}>
                                <option value="date-desc">Sortera: Nyast först</option>
                                <option value="date-asc">Sortera: Äldst först</option>
                                <option value="name-asc">Sortera: Namn (A-Ö)</option>
                            </select>
                    </div>

                    <div className="vr h-50 opacity-25"></div>

                    {/* Filter */}
                    <div className="d-flex align-items-center gap-3">
                        <div className="form-check form-check-inline m-0">
                                <input className="form-check-input" type="checkbox" id="hideEmpty" checked={hideEmptyAssignments} onChange={e => setHideEmptyAssignments(e.target.checked)} />
                                <label className="form-check-label small fw-bold" htmlFor="hideEmpty">Dölj tomma</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TodoToolbar;
