import React, { useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import StreamView from './components/StreamView'
import TodoView from './components/TodoView'
import MatrixView from './components/MatrixView'
import ScheduleView from './components/ScheduleView'
import SettingsView from './components/SettingsView'
import StatusBar from './components/common/StatusBar'
import { dbClear } from './db'
import './App.css'

function App() {
  const [courses, setCourses] = useState([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState({}) 
  const [currentView, setCurrentView] = useState(localStorage.getItem('lastSelectedView') || 'matrix'); // 'matrix' | 'stream' | 'todo' | 'schedule'
  const [viewLoading, setViewLoading] = useState(false);
  const [isManualSync, setIsManualSync] = useState(false);
  
  // Unified Course Data (Single Source of Truth)
  const [currentCourseData, setCurrentCourseData] = useState(null);
  const [courseDataLoading, setCourseDataLoading] = useState(false);

  // New Sync Status State
  const [syncStatus, setSyncStatus] = useState({ active: false, message: '', type: 'info' });

  // Refresh triggers to talk to child components
  const [refreshTriggers, setRefreshTriggers] = useState({ matrix: 0, stream: 0, todo: 0, schedule: 0 });
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  // Settings State
  const [excludeFilters, setExcludeFilters] = useState([]);
  const [excludeTopicFilters, setExcludeTopicFilters] = useState([]);
  const [hiddenCourseIds, setHiddenCourseIds] = useState([]);

  // --- CENTRAL DATA FETCHING (WATERFALL) ---
  const fetchCourseDetails = useCallback(async (courseId, force = false) => {
      if (!courseId) {
          setCurrentCourseData(null);
          return;
      }

      setCourseDataLoading(true);
      handleLoadingChange({ loading: true, message: force ? 'Synkar med Google...' : 'Hämtar data...' });

      try {
          const cacheKey = `course_cache_${courseId}`;
          
          // 1. Try Cache first if not forcing
          if (!force) {
              const { dbGet } = await import('./db');
              const cached = await dbGet(cacheKey);
              if (cached) {
                  setCurrentCourseData(cached.data);
                  const timeStr = new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  setLastUpdated(prev => ({ ...prev, [courseId]: timeStr }));
                  setCourseDataLoading(false);
                  handleLoadingChange(false);
                  return;
              }
          }

          // 2. Try DB (or Google if force=true)
          const url = `/api/courses/${courseId}/details${force ? '?refresh=true' : ''}`;
          const res = await axios.get(url);
          const data = res.data;
          const now = Date.now();

          setCurrentCourseData(data);
          
          const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastUpdated(prev => ({ ...prev, [courseId]: timeStr }));

          // 3. Update Cache
          const { dbSet } = await import('./db');
          await dbSet(cacheKey, { timestamp: now, data });

          // 4. Trigger Todo refresh to incorporate new data into the aggregated list
          setRefreshTriggers(prev => ({ ...prev, todo: prev.todo + 1 }));

          handleLoadingChange({ 
              loading: false, 
              message: force ? `Synkade ${data.students?.length || 0} elever och ${data.coursework?.length || 0} uppgifter.` : null 
          });
      } catch (err) {
          console.error("Waterfall fetch failed:", err);
          handleLoadingChange({ loading: false, message: 'Kunde inte hämta data.' });
      } finally {
          setCourseDataLoading(false);
      }
  }, []);

  const handleLoadingChange = useCallback((loadingState) => {
      const isLoading = typeof loadingState === 'object' ? loadingState.loading : loadingState;
      const customMessage = typeof loadingState === 'object' ? loadingState.message : null;

      setViewLoading(isLoading);

      if (isLoading) {
          setSyncStatus({ 
              active: true, 
              message: customMessage || 'Hämtar data...', 
              type: 'info' 
          });
      } else {
          // When loading finishes, always clear the active status
          setSyncStatus(prev => {
              if (!prev.active && !customMessage) return prev; // No change needed
              
              const newState = { 
                  active: false, 
                  message: customMessage || 'Klar.', 
                  type: customMessage?.includes('misslyckades') ? 'info' : 'success' 
              };

              // Auto-clear message after 5 seconds
              setTimeout(() => {
                  setSyncStatus(p => {
                      if (!p.active) return { active: false, message: '', type: 'info' };
                      return p;
                  });
              }, 5000);

              return newState;
          });
          setIsManualSync(false); 
      }
  }, []);
        const handleRefreshClick = () => {
      setIsManualSync(true); // Enable toast for this operation
      if (currentView === 'schedule') {
          setShowSyncWarning(true);
      } else if (selectedCourseId) {
          fetchCourseDetails(selectedCourseId, true);
      } else if (currentView === 'todo') {
          setRefreshTriggers(prev => ({ ...prev, todo: prev.todo + 1 }));
      }
  };

  const confirmGlobalSync = () => {
      setIsManualSync(true); // Enable toast
      setShowSyncWarning(false);
      setRefreshTriggers(prev => ({ ...prev, schedule: prev.schedule + 1 }));
  };

  // Unified course selection for ALL views
  const [selectedCourseId, setSelectedCourseId] = useState(localStorage.getItem('selectedCourseId') || '');

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

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses');
      setCourses(res.data);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  }

  const handleCourseChange = (courseId) => {
      setSelectedCourseId(courseId);
      localStorage.setItem('selectedCourseId', courseId);
      if (courseId) fetchCourseDetails(courseId, false);
  }

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

  axios.defaults.withCredentials = true;

  useEffect(() => {
    checkLoginStatus();
  }, [])

  // Initial data load when selectedCourseId is restored from localStorage
  useEffect(() => {
      if (isLoggedIn && selectedCourseId && !currentCourseData && !courseDataLoading) {
          fetchCourseDetails(selectedCourseId, false);
      }
  }, [isLoggedIn, selectedCourseId, currentCourseData, courseDataLoading, fetchCourseDetails]);

  useEffect(() => {
    localStorage.setItem('lastSelectedView', currentView);
    const visibleCourses = courses.filter(c => !hiddenCourseIds.includes(c.id));
    
    // Auto-select first course if none selected and we have visible courses
    if (currentView !== 'schedule' && !selectedCourseId && visibleCourses.length > 0) {
        handleCourseChange(visibleCourses[0].id);
    }
  }, [currentView, courses, hiddenCourseIds, selectedCourseId]);

  const handleLogin = () => { window.location.href = '/auth/google'; }
  
  const handleLogout = async () => {
      try {
          await axios.post('/api/logout');
          await dbClear(); 
          localStorage.clear(); 
          setIsLoggedIn(false); 
          setCourses([]);
      } catch (err) { console.error("Logout failed", err); }
  }

  const visibleCoursesList = useMemo(() => courses.filter(c => !hiddenCourseIds.includes(c.id)), [courses, hiddenCourseIds]);
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
                         <button className={`btn btn-sm ${currentView === 'schedule' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center`} onClick={() => setCurrentView('schedule')} title="Schema & Planering (Alla kurser)">
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
                        {visibleCoursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                            onClose={() => setCurrentView('matrix')} 
                        />
                    </div>
                ) : currentView === 'todo' ? (
                    <TodoView 
                        courses={courses}
                        selectedCourseId={selectedCourseId} 
                        currentCourseData={currentCourseData}
                        onSync={() => fetchCourseDetails(selectedCourseId, true)}
                        loading={courseDataLoading}
                        excludeFilters={excludeFilters}
                        excludeTopicFilters={excludeTopicFilters}
                    />
                ) : currentView === 'schedule' ? (
                    <ScheduleView 
                        courses={visibleCoursesList}
                        refreshTrigger={refreshTriggers.schedule || 0}
                        onUpdate={(time) => setLastUpdated(prev => ({ ...prev, schedule: time }))} 
                        onLoading={handleLoadingChange}
                    />
                ) : currentView === 'stream' ? (
                    selectedCourseId ? (
                        <StreamView 
                            courseId={selectedCourseId}
                            currentCourseData={currentCourseData}
                            onSync={() => fetchCourseDetails(selectedCourseId, true)}
                            loading={courseDataLoading}
                            onUpdate={(time) => setLastUpdated(prev => ({ ...prev, [selectedCourseId]: time }))}
                        />
                    ) : <div className="p-5 text-center text-muted">Välj ett klassrum ovan</div>
                ) : (
                    selectedCourseId ? (
                        <MatrixView 
                            courseId={selectedCourseId}
                            courseName={currentCourse?.name}
                            currentCourseData={currentCourseData}
                            onSync={() => fetchCourseDetails(selectedCourseId, true)}
                            loading={courseDataLoading}
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
                                <p className="mb-2">
                                    Du är på väg att uppdatera data för <strong>{visibleCoursesList.length} klassrum</strong>. 
                                    Detta hämtar kalenderhändelser och inlämningsstatus för:
                                </p>
                                <div className="bg-light p-3 rounded border mb-3 overflow-auto" style={{ maxHeight: '150px' }}>
                                    <ul className="list-unstyled mb-0 small">
                                        {visibleCoursesList.map(c => (
                                            <li key={c.id} className="d-flex align-items-center mb-1">
                                                <i className="bi bi-check2-circle text-success me-2"></i>
                                                {c.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
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
            
            <StatusBar status={syncStatus} />
        </>
      )}
    </div>
  )
}

export default App
