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
  // --- 1. STATE DECLARATIONS ---
  const [courses, setCourses] = useState([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState({}) 
  const [currentView, setCurrentView] = useState(localStorage.getItem('lastSelectedView') || 'matrix');
  const [viewLoading, setViewLoading] = useState(false);
  const [isManualSync, setIsManualSync] = useState(false);
  
  const [currentCourseData, setCurrentCourseData] = useState(null);
  const [allAnnouncements, setAllAnnouncements] = useState({}); 
  const [allNotes, setAllNotes] = useState({}); // postId -> content string
  const [allEvents, setAllEvents] = useState([]); 
  const [courseDataLoading, setCourseDataLoading] = useState(false);

  const [syncStatus, setSyncStatus] = useState({ active: false, message: '', type: 'info' });
  const [refreshTriggers, setRefreshTriggers] = useState({ matrix: 0, stream: 0, todo: 0, schedule: 0 });
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  const [excludeFilters, setExcludeFilters] = useState([]);
  const [excludeTopicFilters, setExcludeTopicFilters] = useState([]);
  const [hiddenCourseIds, setHiddenCourseIds] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(localStorage.getItem('selectedCourseId') || '');

  // --- 2. MEMOIZED DATA ---
  const visibleCoursesList = useMemo(() => courses.filter(c => !hiddenCourseIds.includes(c.id)), [courses, hiddenCourseIds]);
  const currentCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);

  // --- 3. CALLBACK FUNCTIONS ---
  const handleLoadingChange = useCallback((loadingState) => {
      const isLoading = typeof loadingState === 'object' ? loadingState.loading : loadingState;
      const customMessage = typeof loadingState === 'object' ? loadingState.message : null;

      setViewLoading(isLoading);

      if (isLoading) {
          setSyncStatus({ active: true, message: customMessage || 'Hämtar data...', type: 'info' });
      } else {
          setSyncStatus(prev => {
              if (!prev.active && !customMessage) return prev;
              const newState = { 
                  active: false, 
                  message: customMessage || 'Klar.', 
                  type: customMessage?.includes('misslyckades') ? 'info' : 'success' 
              };
              setTimeout(() => {
                  setSyncStatus(p => (!p.active ? { active: false, message: '', type: 'info' } : p));
              }, 5000);
              return newState;
          });
          setIsManualSync(false); 
      }
  }, []);

  const fetchCalendarEvents = useCallback(async (courseIds, force = false) => {
      if (!courseIds || courseIds.length === 0) return;
      const cacheKey = `schedule_cache_global`;
      const { dbGet, dbSet } = await import('./db');

      if (!force) {
          const cached = await dbGet(cacheKey);
          if (cached) {
              setAllEvents(cached.data);
              setLastUpdated(prev => ({ ...prev, schedule: new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
              return;
          }
      }

      try {
          const res = await axios.get(`/api/events?refresh=true`, { params: { courseIds } });
          setAllEvents(res.data);
          const now = Date.now();
          setLastUpdated(prev => ({ ...prev, schedule: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
          await dbSet(cacheKey, { timestamp: now, data: res.data });
      } catch (err) {
          console.error("Failed to fetch calendar events:", err);
      }
  }, []);

  const fetchNotes = useCallback(async (courseId) => {
      if (!courseId) return;
      try {
          const res = await axios.get(`/api/notes/${courseId}`);
          setAllNotes(prev => ({ ...prev, ...res.data }));
      } catch (err) {
          console.warn("Failed to fetch notes:", err);
      }
  }, []);

  const updateNoteLocally = useCallback((postId, content) => {
      setAllNotes(prev => ({ ...prev, [postId]: content }));
  }, []);

  const fetchCourseDetails = useCallback(async (courseId, force = false) => {
      if (!courseId) {
          setCurrentCourseData(null);
          return;
      }

      setCourseDataLoading(true);
      handleLoadingChange({ loading: true, message: force ? 'Synkar med Google...' : 'Hämtar data...' });

      try {
          // Fetch notes in parallel with other data
          fetchNotes(courseId);

          const cacheKey = `course_cache_${courseId}`;
          if (!force) {
              const { dbGet } = await import('./db');
              const cached = await dbGet(cacheKey);
              if (cached) {
                  setCurrentCourseData(cached.data);
                  if (cached.data.announcements) setAllAnnouncements(prev => ({ ...prev, [courseId]: cached.data.announcements }));
                  const timeStr = new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  setLastUpdated(prev => ({ ...prev, [courseId]: timeStr }));
                  setCourseDataLoading(false);
                  handleLoadingChange(false);
                  return;
              }
          }

          const url = `/api/courses/${courseId}/details${force ? '?refresh=true' : ''}`;
          const res = await axios.get(url);
          const data = res.data;
          const now = Date.now();

          setCurrentCourseData(data);
          if (data.announcements) setAllAnnouncements(prev => ({ ...prev, [courseId]: data.announcements }));
          const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastUpdated(prev => ({ ...prev, [courseId]: timeStr }));

          const { dbSet } = await import('./db');
          await dbSet(cacheKey, { timestamp: now, data });
          setRefreshTriggers(prev => ({ ...prev, todo: prev.todo + 1 }));
          handleLoadingChange({ loading: false, message: force ? `Synkade ${data.students?.length || 0} elever.` : null });
      } catch (err) {
          console.error("Waterfall fetch failed:", err);
          handleLoadingChange({ loading: false, message: 'Kunde inte hämta data.' });
      } finally {
          setCourseDataLoading(false);
      }
  }, [handleLoadingChange]);

  const handleCourseChange = useCallback((courseId) => {
      setSelectedCourseId(courseId);
      localStorage.setItem('selectedCourseId', courseId);
      if (courseId) fetchCourseDetails(courseId, false);
  }, [fetchCourseDetails]);

  const confirmGlobalSync = useCallback(async () => {
      setIsManualSync(true);
      setShowSyncWarning(false);
      handleLoadingChange({ loading: true, message: 'Startar global synkning...' });

      try {
          const visibleIds = visibleCoursesList.map(c => c.id);
          const idString = visibleIds.join(',');

          handleLoadingChange({ loading: true, message: 'Synkar kalender...' });
          await fetchCalendarEvents(idString, true);

          for (let i = 0; i < visibleIds.length; i++) {
              handleLoadingChange({ loading: true, message: `Synkar kurs ${i + 1} av ${visibleIds.length}...` });
              await fetchCourseDetails(visibleIds[i], true);
          }

          setRefreshTriggers(prev => ({ 
              matrix: prev.matrix + 1, 
              stream: prev.stream + 1, 
              todo: prev.todo + 1, 
              schedule: prev.schedule + 1 
          }));

          handleLoadingChange({ loading: false, message: 'Global synkning slutförd!' });
      } catch (err) {
          console.error("Global sync failed:", err);
          handleLoadingChange({ loading: false, message: 'Global synkning misslyckades.' });
      }
  }, [visibleCoursesList, fetchCalendarEvents, fetchCourseDetails, handleLoadingChange]);

  const handleRefreshClick = useCallback(() => {
      setIsManualSync(true);
      
      // Decisions:
      // 1. If in schedule view, or in 'All Classrooms' Todo view -> Global Sync
      if (currentView === 'schedule' || (currentView === 'todo' && !selectedCourseId)) {
          setShowSyncWarning(true);
      } 
      // 2. If a specific course is selected -> Sync that course
      else if (selectedCourseId) {
          fetchCourseDetails(selectedCourseId, true);
      }
  }, [currentView, selectedCourseId, fetchCourseDetails]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get('/api/courses');
      setCourses(res.data);
      return res.data;
    } catch (err) { 
      console.error("Failed to fetch courses", err); 
      return [];
    }
  }, []);

  const loadAllCachedData = useCallback(async (courseList) => {
      const { dbGet, dbGetAllKeys } = await import('./db');
      const allKeys = await dbGetAllKeys();
      
      console.log("[CACHE] Loading all cached data...");
      
      // 1. Load Calendar
      const scheduleCached = await dbGet('schedule_cache_global');
      if (scheduleCached) {
          setAllEvents(scheduleCached.data);
          setLastUpdated(prev => ({ ...prev, schedule: new Date(scheduleCached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
      }

      // 2. Load Course Details for all visible courses
      for (const course of courseList) {
          const courseCached = await dbGet(`course_cache_${course.id}`);
          if (courseCached) {
              if (courseCached.data.announcements) {
                  setAllAnnouncements(prev => ({ ...prev, [course.id]: courseCached.data.announcements }));
              }
              const timeStr = new Date(courseCached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setLastUpdated(prev => ({ ...prev, [course.id]: timeStr }));
              
              // If this is our currently selected course, set it as active
              if (course.id === selectedCourseId) {
                  setCurrentCourseData(courseCached.data);
              }
          }
      }
  }, [selectedCourseId]);

  const fetchSettings = useCallback(async () => {
      try {
          const res = await axios.get('/api/settings');
          if (res.data.excludeFilters) setExcludeFilters(res.data.excludeFilters);
          if (res.data.excludeTopicFilters) setExcludeTopicFilters(res.data.excludeTopicFilters);
          if (res.data.hiddenCourseIds) setHiddenCourseIds(res.data.hiddenCourseIds);
      } catch (err) { console.error("Failed to fetch settings", err); }
  }, []);

  const saveSettings = useCallback(async (assignments, topics, hiddenCourses) => {
      try {
          await axios.post('/api/settings', { 
              excludeFilters: assignments, excludeTopicFilters: topics, hiddenCourseIds: hiddenCourses
          });
      } catch (err) { console.error("Failed to save settings", err); }
  }, []);

  const handleUpdateFilters = useCallback((newFilters) => {
      setExcludeFilters(newFilters);
      saveSettings(newFilters, excludeTopicFilters, hiddenCourseIds);
  }, [excludeTopicFilters, hiddenCourseIds, saveSettings]);

  const handleUpdateTopicFilters = useCallback((newFilters) => {
      setExcludeTopicFilters(newFilters);
      saveSettings(excludeFilters, newFilters, hiddenCourseIds);
  }, [excludeFilters, hiddenCourseIds, saveSettings]);

  const handleToggleCourse = useCallback((courseId) => {
      const isHidden = hiddenCourseIds.includes(courseId);
      const newHidden = isHidden ? hiddenCourseIds.filter(id => id !== courseId) : [...hiddenCourseIds, courseId];
      setHiddenCourseIds(newHidden);
      saveSettings(excludeFilters, excludeTopicFilters, newHidden);
  }, [hiddenCourseIds, excludeFilters, excludeTopicFilters, saveSettings]);

  const checkLoginStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/user');
      setIsLoggedIn(res.data.loggedIn);
      if (res.data.loggedIn) {
        const [courseList] = await Promise.all([
            fetchCourses(),
            fetchSettings()
        ]);
        // Hydrate all views from cache immediately
        if (courseList) loadAllCachedData(courseList);
      }
    } catch (err) { console.error("Login check failed", err); }
    finally { setLoading(false); }
  }, [fetchCourses, fetchSettings, loadAllCachedData]);

  const handleLogout = useCallback(async () => {
      try {
          await axios.post('/api/logout');
          await dbClear(); 
          localStorage.clear(); 
          setIsLoggedIn(false); 
          setCourses([]);
      } catch (err) { console.error("Logout failed", err); }
  }, []);

  const handleLogin = () => { window.location.href = '/auth/google'; }

  // --- 4. EFFECTS ---
  useEffect(() => { axios.defaults.withCredentials = true; checkLoginStatus(); }, [checkLoginStatus]);

  useEffect(() => {
      if (isLoggedIn && selectedCourseId && !currentCourseData && !courseDataLoading) {
          fetchCourseDetails(selectedCourseId, false);
      }
  }, [isLoggedIn, selectedCourseId, currentCourseData, courseDataLoading, fetchCourseDetails]);

  useEffect(() => {
      if (isLoggedIn && visibleCoursesList.length > 0 && allEvents.length === 0) {
          fetchCalendarEvents(visibleCoursesList.map(c => c.id).join(','), false);
      }
  }, [isLoggedIn, visibleCoursesList, allEvents.length, fetchCalendarEvents]);

  useEffect(() => {
    localStorage.setItem('lastSelectedView', currentView);
    if (currentView !== 'schedule' && !selectedCourseId && visibleCoursesList.length > 0) {
        handleCourseChange(visibleCoursesList[0].id);
    }
  }, [currentView, visibleCoursesList, selectedCourseId, handleCourseChange]);

  // --- 5. RENDER ---
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
                        onSync={handleRefreshClick}
                        loading={courseDataLoading}
                        excludeFilters={excludeFilters}
                        excludeTopicFilters={excludeTopicFilters}
                    />
                ) : currentView === 'schedule' ? (
                    <ScheduleView 
                        courses={visibleCoursesList}
                        events={allEvents}
                        allAnnouncements={allAnnouncements}
                        allNotes={allNotes}
                        refreshTrigger={refreshTriggers.schedule}
                        onUpdate={(time) => setLastUpdated(prev => ({ ...prev, schedule: time }))} 
                        onLoading={handleLoadingChange}
                        excludeFilters={excludeFilters}
                        excludeTopicFilters={excludeTopicFilters}
                    />
                ) : currentView === 'stream' ? (
                    selectedCourseId ? (
                        <StreamView 
                            courseId={selectedCourseId}
                            currentCourseData={currentCourseData}
                            allNotes={allNotes}
                            onUpdateNote={updateNoteLocally}
                            onSync={handleRefreshClick}
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
                            onSync={handleRefreshClick}
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
            
            <StatusBar 
                status={syncStatus} 
                lastUpdated={lastUpdated[currentView === 'schedule' ? 'schedule' : (currentView === 'todo' ? 'todo' : selectedCourseId)]} 
            />
        </>
      )}
    </div>
  )
}

export default App