import React, { useState, useEffect } from 'react'
import axios from 'axios'
import StreamView from './components/StreamView'
import TodoView from './components/TodoView'
import MatrixView from './components/MatrixView'
import ScheduleView from './components/ScheduleView'
import SettingsView from './components/SettingsView'
import { dbClear } from './db'
import './App.css'

function App() {
  const [courses, setCourses] = useState([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState({}) 
  const [currentView, setCurrentView] = useState(localStorage.getItem('lastSelectedView') || 'matrix'); // 'matrix' | 'stream' | 'todo' | 'schedule'
  const [viewLoading, setViewLoading] = useState(false);

  // Per-view course selection memory
  const [viewCourseIds, setViewCourseIds] = useState(() => {
    try {
        const saved = localStorage.getItem('viewCourseIds');
        return saved ? JSON.parse(saved) : { matrix: '', stream: '', todo: '' };
    } catch (e) {
        return { matrix: '', stream: '', todo: '' };
    }
  });

  const selectedCourseId = viewCourseIds[currentView] || '';
  
  // Settings State
  const [excludeFilters, setExcludeFilters] = useState([]);
  const [excludeTopicFilters, setExcludeTopicFilters] = useState([]);
  const [hiddenCourseIds, setHiddenCourseIds] = useState([]);

  const fetchSettings = async () => {
      try {
          const res = await axios.get('/api/settings');
          if (res.data.excludeFilters) setExcludeFilters(res.data.excludeFilters);
          if (res.data.excludeTopicFilters) setExcludeTopicFilters(res.data.excludeTopicFilters);
          if (res.data.hiddenCourseIds) setHiddenCourseIds(res.data.hiddenCourseIds);
      } catch (err) {
          console.error("Failed to fetch settings", err);
      }
  };

  const saveSettings = async (assignments, topics, hiddenCourses) => {
      try {
          await axios.post('/api/settings', { 
              excludeFilters: assignments, 
              excludeTopicFilters: topics,
              hiddenCourseIds: hiddenCourses
          });
      } catch (err) {
          console.error("Failed to save settings", err);
      }
  };

  const handleUpdateFilters = (newFilters) => {
      setExcludeFilters(newFilters);
      saveSettings(newFilters, excludeTopicFilters, hiddenCourseIds);
  };

  const handleUpdateTopicFilters = (newFilters) => {
      setExcludeTopicFilters(newFilters);
      saveSettings(excludeFilters, newFilters, hiddenCourseIds);
  };

  const handleToggleCourse = (courseId) => {
      const isHidden = hiddenCourseIds.includes(courseId);
      let newHidden;
      if (isHidden) {
          newHidden = hiddenCourseIds.filter(id => id !== courseId);
      } else {
          newHidden = [...hiddenCourseIds, courseId];
      }
      setHiddenCourseIds(newHidden);
      saveSettings(excludeFilters, excludeTopicFilters, newHidden);
  };

  // Refresh triggers to talk to child components
  const [refreshTriggers, setRefreshTriggers] = useState({ matrix: 0, stream: 0, todo: 0, schedule: 0 });
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  axios.defaults.withCredentials = true;

  const handleRefreshClick = () => {
      if (currentView === 'schedule') {
          setShowSyncWarning(true);
      } else {
          setRefreshTriggers(prev => ({ ...prev, [currentView]: prev[currentView] + 1 }));
      }
  };

  const confirmGlobalSync = () => {
      setShowSyncWarning(false);
      setRefreshTriggers(prev => ({ ...prev, schedule: prev.schedule + 1 }));
  };

  useEffect(() => {
    localStorage.setItem('lastSelectedView', currentView);
    // When switching view, if that view has no course selected yet, pick the first visible one
    const visibleCourses = courses.filter(c => !hiddenCourseIds.includes(c.id));
    if (currentView !== 'schedule' && !viewCourseIds[currentView] && visibleCourses.length > 0) {
        // We only auto-select for matrix/stream. Todo can stay as 'All' (empty string).
        if (currentView === 'matrix' || currentView === 'stream') {
            handleCourseChange(visibleCourses[0].id, currentView);
        }
    }
  }, [currentView, courses, hiddenCourseIds]);

  useEffect(() => {
    checkLoginStatus();
  }, [])

  const checkLoginStatus = async () => {
    try {
      const res = await axios.get('/api/user');
      setIsLoggedIn(res.data.loggedIn);
      if (res.data.loggedIn) {
        await Promise.all([
            fetchCourses(),
            fetchSettings()
        ]);
      }
    } catch (err) {
      console.error("Login check failed", err);
    } finally {
      setLoading(false);
    }
  }

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses');
      setCourses(res.data);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  }

  const handleCourseChange = (courseId, view = currentView) => {
      const nextViewCourseIds = { ...viewCourseIds, [view]: courseId };
      setViewCourseIds(nextViewCourseIds);
      localStorage.setItem('viewCourseIds', JSON.stringify(nextViewCourseIds));
      
      if (!courseId && view !== 'todo') {
          // If clearing course in a view that requires it, fallback or stay as is? 
          // For now, if user clears it in matrix/stream, let it be empty (shows message).
      }
  }

  const handleLogin = () => { window.location.href = '/auth/google'; }
  
  const handleLogout = async () => {
      try {
          await axios.post('/api/logout');
          await dbClear(); // Clear IndexedDB
          localStorage.clear(); // Clear LocalStorage
          setIsLoggedIn(false); 
          setCourses([]);
      } catch (err) { console.error("Logout failed", err); }
  }

  const visibleCourses = React.useMemo(() => courses.filter(c => !hiddenCourseIds.includes(c.id)), [courses, hiddenCourseIds]);
  const currentCourse = courses.find(c => c.id === selectedCourseId);

  if (loading) return (
      <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Laddar...</span></div>
      </div>
  );
  
  return (
    <div className="d-flex flex-column vh-100 overflow-hidden bg-light">
      {!isLoggedIn ? (
        <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1">
            <div className="text-center p-5 bg-white rounded shadow-sm border">
                <h1 className="h3 mb-3 fw-bold text-primary">Classroom Matrix</h1>
                <p className="text-muted mb-4">Logga in för att se dina kurser och elevresultat.</p>
                <button onClick={handleLogin} className="btn btn-primary btn-lg rounded-pill px-5">
                    <i className="bi bi-google me-2"></i> Logga in med Google
                </button>
            </div>
        </div>
      ) : (
        <>
            <header className="bg-light border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm z-10" style={{ minHeight: '60px' }}>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                         <button className={`btn btn-sm ${currentView === 'schedule' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`} onClick={() => { setCurrentView('schedule'); handleCourseChange('', 'schedule'); }} title="Schema & Planering (Alla kurser)">
                             <i className="bi bi-calendar-week fs-5"></i>
                         </button>
                         <div className="vr mx-2"></div>
                         <button className={`btn btn-sm ${currentView === 'matrix' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`} onClick={() => setCurrentView('matrix')} title="Matrisvy">
                             <i className="bi bi-grid-3x3-gap-fill fs-5"></i>
                         </button>
                         <button className={`btn btn-sm ${currentView === 'stream' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`} onClick={() => setCurrentView('stream')} title="Kursflöde">
                             <i className="bi bi-chat-square-text-fill fs-5"></i>
                         </button>
                         <button className={`btn btn-sm ${currentView === 'todo' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`} onClick={() => setCurrentView('todo')} title="Att göra">
                             <i className="bi bi-check2-square fs-5"></i>
                         </button>
                         <button className={`btn btn-sm ${currentView === 'settings' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`} onClick={() => setCurrentView('settings')} title="Inställningar">
                             <i className="bi bi-gear-fill fs-5"></i>
                         </button>
                    </div>
                    <div className="vr mx-2"></div>
                    
                    <select className="form-select form-select-sm fw-bold border-primary" style={{ maxWidth: '300px', opacity: currentView === 'schedule' ? 0.5 : 1 }} value={selectedCourseId} onChange={(e) => handleCourseChange(e.target.value)} disabled={currentView === 'schedule'}>
                        <option value="">Alla klassrum (Todo)</option>
                        {visibleCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {currentCourse && <a href={currentCourse.alternateLink} target="_blank" rel="noreferrer" className="btn btn-link btn-sm text-decoration-none" title="Öppna i Classroom"><i className="bi bi-box-arrow-up-right"></i></a>}
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div className="text-muted small d-none d-md-block me-1">
                        {lastUpdated[currentView === 'todo' ? 'todo' : selectedCourseId] && <span>Uppdaterad {lastUpdated[currentView === 'todo' ? 'todo' : selectedCourseId]}</span>}
                    </div>
                    <button onClick={handleRefreshClick} 
                        className={`btn btn-sm d-flex align-items-center gap-2 ${viewLoading ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                        title="Hämta senaste data från Google Classroom"
                        disabled={viewLoading}
                    >
                        <i className={`bi bi-arrow-clockwise ${viewLoading ? 'spin' : ''}`}></i>
                        {viewLoading && <span className="small fw-bold">Synkar...</span>}
                    </button>
                    <button onClick={handleLogout} className="btn btn-light btn-sm text-danger" title="Logga ut"><i className="bi bi-power"></i></button>
                </div>
            </header>

            <main className="flex-grow-1 overflow-hidden d-flex flex-column position-relative bg-white">
                {currentView === 'settings' ? (
                    <div className="flex-grow-1 overflow-auto bg-light">
                        <SettingsView 
                            courses={courses}
                            hiddenCourseIds={hiddenCourseIds}
                            onToggleCourse={handleToggleCourse}
                            excludeFilters={excludeFilters}
                            onUpdateFilters={handleUpdateFilters}
                            excludeTopicFilters={excludeTopicFilters}
                            onUpdateTopicFilters={handleUpdateTopicFilters}
                            onClose={() => setCurrentView('matrix')} // Default back to matrix
                        />
                    </div>
                ) : currentView === 'todo' ? (
                    <TodoView 
                        selectedCourseId={selectedCourseId} 
                        refreshTrigger={refreshTriggers.todo} 
                        onUpdate={(time) => setLastUpdated(prev => ({ ...prev, todo: time }))}
                        onLoading={setViewLoading}
                        excludeFilters={excludeFilters}
                        excludeTopicFilters={excludeTopicFilters}
                    />
                ) : currentView === 'schedule' ? (
                    <ScheduleView 
                        courses={visibleCourses}
                        refreshTrigger={refreshTriggers.schedule || 0}
                        onUpdate={(time) => setLastUpdated(prev => ({ ...prev, schedule: time }))} // Use generic key
                        onLoading={setViewLoading}
                    />
                ) : currentView === 'stream' ? (
                    selectedCourseId ? (
                        <StreamView 
                            courseId={selectedCourseId}
                            refreshTrigger={refreshTriggers.stream}
                            onUpdate={(time) => setLastUpdated(prev => ({ ...prev, [selectedCourseId]: time }))}
                            onLoading={setViewLoading}
                        />
                    ) : <div className="p-5 text-center text-muted">Välj ett klassrum ovan</div>
                ) : (
                    selectedCourseId ? (
                        <MatrixView 
                            courseId={selectedCourseId}
                            courseName={currentCourse?.name}
                            refreshTrigger={refreshTriggers.matrix}
                            onUpdate={(time) => setLastUpdated(prev => ({ ...prev, [selectedCourseId]: time }))}
                            onLoading={setViewLoading}
                            excludeFilters={excludeFilters}
                            excludeTopicFilters={excludeTopicFilters}
                        />
                    ) : (
                        <div className="d-flex justify-content-center align-items-center flex-grow-1 text-muted">
                            <div><i className="bi bi-arrow-up-circle fs-1 d-block text-center mb-2 opacity-25"></i>Välj ett klassrum i listan ovan</div>
                        </div>
                    )
                )}
            </main>

            {/* Sync Warning Modal */}
            {showSyncWarning && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }} onClick={() => setShowSyncWarning(false)}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-warning-subtle text-dark border-bottom-0">
                                <h5 className="modal-title fw-bold d-flex align-items-center">
                                    <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
                                    Bekräfta global synkning
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowSyncWarning(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">
                                    Du är på väg att uppdatera data för <strong>alla dina klassrum</strong> samtidigt. 
                                    Detta hämtar både kalenderhändelser och inlämningsstatus för alla kurser.
                                </p>
                                <p className="mt-3 text-muted small mb-0">
                                    Detta kan ta en liten stund beroende på hur många kurser du har.
                                </p>
                            </div>
                            <div className="modal-footer border-top-0 bg-light">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSyncWarning(false)}>Avbryt</button>
                                <button type="button" className="btn btn-primary px-4 fw-bold" onClick={confirmGlobalSync}>
                                    Starta synkning
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  )
}

export default App