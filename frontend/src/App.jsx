import React, { useState, useEffect } from 'react'
import axios from 'axios'
import StreamView from './components/StreamView'
import TodoView from './components/TodoView'
import MatrixView from './components/MatrixView'
import ScheduleView from './components/ScheduleView'
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
  const [showSettings, setShowSettings] = useState(false);
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

  axios.defaults.withCredentials = true;

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
                    <button onClick={() => setRefreshTriggers(prev => ({ ...prev, [currentView]: prev[currentView] + 1 }))} 
                        className="btn btn-outline-secondary btn-sm" 
                        title="Hämta senaste data från Google Classroom"
                        disabled={viewLoading}
                    >
                        <i className={`bi bi-arrow-clockwise d-inline-block ${viewLoading ? 'spin' : ''}`}></i>
                    </button>
                    <button onClick={() => setShowSettings(true)} className="btn btn-light btn-sm" title="Inställningar">
                        <i className="bi bi-gear"></i>
                    </button>
                    <button onClick={handleLogout} className="btn btn-light btn-sm text-danger" title="Logga ut"><i className="bi bi-power"></i></button>
                </div>
            </header>

            <main className="flex-grow-1 overflow-hidden d-flex flex-column position-relative bg-white">
                {currentView === 'todo' ? (
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

            {/* Settings Modal */}
            {showSettings && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000 }} onClick={() => setShowSettings(false)}>
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold d-flex align-items-center">
                                    <i className="bi bi-sliders2-vertical me-2 text-primary"></i>
                                    Inställningar
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowSettings(false)} aria-label="Close"></button>
                            </div>
                            <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                
                                {/* COURSE FILTER */}
                                <div className="mb-5">
                                    <label className="form-label fw-bold mb-1">Dina klassrum</label>
                                    <p className="small text-muted mb-3">Välj vilka klassrum du vill se i appen. (Avmarkera för att dölja gamla kurser).</p>
                                    <div className="border rounded p-3 bg-white" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {courses.length > 0 ? courses.map(course => (
                                            <div key={course.id} className="form-check mb-2">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    id={`course-${course.id}`}
                                                    checked={!hiddenCourseIds.includes(course.id)}
                                                    onChange={() => handleToggleCourse(course.id)}
                                                />
                                                <label className="form-check-label d-flex align-items-center gap-2" htmlFor={`course-${course.id}`}>
                                                    <span className="fw-medium">{course.name}</span>
                                                    {course.section && <span className="badge bg-light text-muted border">{course.section}</span>}
                                                </label>
                                            </div>
                                        )) : <div className="text-muted small">Inga kurser hittades.</div>}
                                    </div>
                                </div>

                                {/* ASSIGNMENT FILTER */}
                                <div className="mb-5">
                                    <label className="form-label fw-bold mb-1">Dölj uppgifter</label>
                                    <p className="small text-muted mb-3">Uppgifter vars titel innehåller något av dessa ord döljs.</p>
                                    <div className="input-group mb-3">
                                        <input type="text" id="filter-input" className="form-control" placeholder="Ex: Lunch..." onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                if (!excludeFilters.includes(e.target.value.trim())) handleUpdateFilters([...excludeFilters, e.target.value.trim()]);
                                                e.target.value = '';
                                            }
                                        }} />
                                        <button className="btn btn-primary" onClick={() => {
                                            const input = document.getElementById('filter-input');
                                            if (input.value.trim() && !excludeFilters.includes(input.value.trim())) handleUpdateFilters([...excludeFilters, input.value.trim()]);
                                            input.value = '';
                                        }}>Lägg till</button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {excludeFilters.map(f => (
                                            <span key={f} className="badge bg-light text-dark border d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm">
                                                {f} <i className="bi bi-x-circle-fill text-danger cursor-pointer" onClick={() => handleUpdateFilters(excludeFilters.filter(x => x !== f))}></i>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* TOPIC FILTER */}
                                <div>
                                    <label className="form-label fw-bold mb-1">Dölj hela ämnen</label>
                                    <p className="small text-muted mb-3">Ämnen som matchar dessa ord (och alla dess uppgifter) döljs helt.</p>
                                    <div className="input-group mb-3">
                                        <input type="text" id="topic-filter-input" className="form-control" placeholder="Ex: Administration..." onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                if (!excludeTopicFilters.includes(e.target.value.trim())) handleUpdateTopicFilters([...excludeTopicFilters, e.target.value.trim()]);
                                                e.target.value = '';
                                            }
                                        }} />
                                        <button className="btn btn-primary" onClick={() => {
                                            const input = document.getElementById('topic-filter-input');
                                            if (input.value.trim() && !excludeTopicFilters.includes(input.value.trim())) handleUpdateTopicFilters([...excludeTopicFilters, input.value.trim()]);
                                            input.value = '';
                                        }}>Lägg till</button>
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {excludeTopicFilters.map(f => (
                                            <span key={f} className="badge bg-light text-dark border d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm">
                                                {f} <i className="bi bi-x-circle-fill text-danger cursor-pointer" onClick={() => handleUpdateTopicFilters(excludeTopicFilters.filter(x => x !== f))}></i>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-dark px-5 rounded-pill fw-bold" onClick={() => setShowSettings(false)}>Klar</button>
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