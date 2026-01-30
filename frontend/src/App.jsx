import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format, getISOWeek, parseISO } from 'date-fns'
import { sv } from 'date-fns/locale'
import StreamView from './components/StreamView'
import TodoView from './components/TodoView'
import { dbGet, dbSet } from './db'
import './App.css'

function App() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(localStorage.getItem('lastSelectedCourseId') || '')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [courseDetails, setCourseDetails] = useState({})
  const [loadingDetails, setLoadingDetails] = useState({})
  const [assignmentFilters, setAssignmentFilters] = useState({})
  const [expandedTopics, setExpandedTopics] = useState({})
  const [sortConfig, setSortConfig] = useState({})
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [lastUpdated, setLastUpdated] = useState({}) 
  const [showGraded, setShowGraded] = useState(true)
  const [showUngraded, setShowUngraded] = useState(true)
  const [showPending, setShowPending] = useState(false)
  const [currentView, setCurrentView] = useState(localStorage.getItem('lastSelectedView') || 'matrix'); // 'matrix' | 'stream' | 'todo'
  
  // Stream View State
  const [streamAnnouncements, setStreamAnnouncements] = useState([]);
  const [streamNotes, setStreamNotes] = useState({});
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(null);
  
  // Refresh handler specifically for Todo view (passed via context or prop is hard, let's use a trigger)
  const [todoRefreshTrigger, setTodoRefreshTrigger] = useState(0);

  axios.defaults.withCredentials = true;

  // Persist current view
  useEffect(() => {
    localStorage.setItem('lastSelectedView', currentView);
  }, [currentView]);

  useEffect(() => {
    checkLoginStatus();
  }, [])

  // Load Stream Data from cache when switching to Stream view or changing course
  useEffect(() => {
      const loadStreamCache = async () => {
          if (currentView === 'stream' && selectedCourseId) {
              const cacheKey = `stream_cache_${selectedCourseId}`;
              try {
                  const cached = await dbGet(cacheKey);
                  if (cached) {
                      setStreamAnnouncements(cached.data);
                  } else {
                      fetchStreamData(selectedCourseId);
                  }
              } catch (e) {
                  console.warn("Stream cache load failed", e);
                  fetchStreamData(selectedCourseId);
              }
          }
      };
      loadStreamCache();
  }, [currentView, selectedCourseId]);

  const checkLoginStatus = async () => {
    try {
      const res = await axios.get('/api/user');
      setIsLoggedIn(res.data.loggedIn);
      if (res.data.loggedIn) {
        await fetchCourses();
      }
    } catch (err) {
      console.error("Login check failed", err);
    } finally {
      setLoading(false);
    }
  }

  const fetchStreamData = async (courseId, forceUpdate = false) => {
      if (!courseId) return; // Guard clause
      const cacheKey = `stream_cache_${courseId}`;
      
      if (!forceUpdate) {
          try {
              const cached = await dbGet(cacheKey);
              if (cached) {
                  setStreamAnnouncements(cached.data);
              }
          } catch (e) {
              console.warn("Stream cache load failed", e);
          }
      }

      setStreamLoading(true);
      setStreamError(null);
      try {
          const [annRes, notesRes] = await Promise.all([
              axios.get(`/api/courses/${courseId}/announcements`),
              axios.get(`/api/notes/${courseId}`)
          ]);
          setStreamAnnouncements(annRes.data);
          setStreamNotes(notesRes.data);
          
          await dbSet(cacheKey, {
              timestamp: Date.now(),
              data: annRes.data
          });
      } catch (err) {
          console.error("Failed to fetch stream data", err);
          setStreamError("Kunde inte hämta inlägg.");
      } finally {
          setStreamLoading(false);
      }
  }

  const handleSaveNote = async (postId, content) => {
      await axios.post('/api/notes', {
          courseId: selectedCourseId,
          postId,
          content
      });
      setStreamNotes(prev => ({ ...prev, [postId]: content }));
  };

  const handleExportLogbook = () => {
      const lines = [];
      const courseName = courses.find(c => c.id === selectedCourseId)?.name || 'Okänd kurs';
      lines.push(`# Loggbok: ${courseName}`);
      lines.push(`Exporterad: ${new Date().toLocaleDateString('sv-SE')}\n`);

      streamAnnouncements.forEach(post => {
          const postDate = parseISO(post.updateTime);
          const dateStr = format(postDate, "yyyy-MM-dd HH:mm", { locale: sv });
          const weekStr = getISOWeek(postDate);
          
          lines.push(`## ${dateStr} (v.${weekStr})`);
          lines.push(`**Classroom:**\n${post.text || '(Ingen text)'}\n`);
          
          if (post.materials && post.materials.length > 0) {
               lines.push(`*Material:* ${post.materials.map(m => {
                   if (m.driveFile) return `[Drive] ${m.driveFile.driveFile.title}`;
                   if (m.link) return `[Länk] ${m.link.title}`;
                   if (m.youtubeVideo) return `[Video] ${m.youtubeVideo.title}`;
                   return 'Fil';
               }).join(', ')}\n`);
          }

          if (streamNotes[post.id]) {
              lines.push(`\n**Mina Anteckningar:**\n${streamNotes[post.id]}\n`);
          }
          lines.push('---\n');
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${courseName}_loggbok_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get('/api/courses');
      setCourses(res.data);
      
      const savedCourseId = localStorage.getItem('lastSelectedCourseId');
      if (savedCourseId && res.data.find(c => c.id === savedCourseId)) {
          handleCourseChange(savedCourseId);
      } else if (res.data.length > 0 && !selectedCourseId) {
          handleCourseChange(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  }

  const handleCourseChange = async (courseId) => {
      setSelectedCourseId(courseId);
      localStorage.setItem('lastSelectedCourseId', courseId);
      if (courseId && !courseDetails[courseId]) {
          await fetchCourseDetails(courseId);
      }
  }

  const toggleTopic = (courseId, topicId) => {
      setExpandedTopics(prev => ({
          ...prev,
          [courseId]: {
              ...prev[courseId],
              [topicId]: !prev[courseId]?.[topicId]
          }
      }));
  }

  const fetchCourseDetails = async (courseId, forceUpdate = false) => {
    if (!courseId) return; // Guard clause
    const cacheKey = `course_cache_${courseId}`;
    
    if (!forceUpdate && !courseDetails[courseId]) {
        try {
            const cached = await dbGet(cacheKey);
            if (cached) {
                setCourseDetails(prev => ({ ...prev, [courseId]: cached.data }));
                if (cached.timestamp) {
                    setLastUpdated(prev => ({ ...prev, [courseId]: new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
                }
                return; 
            }
        } catch (e) {
            console.warn("Cache load failed", e);
        }
    }

    setLoadingDetails(prev => ({ ...prev, [courseId]: true }));
    try {
      const res = await axios.get(`/api/courses/${courseId}/details`);
      const now = Date.now();
      setCourseDetails(prev => ({ ...prev, [courseId]: res.data }));
      setLastUpdated(prev => ({ ...prev, [courseId]: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
      
      await dbSet(cacheKey, {
          timestamp: now,
          data: res.data
      });
    } catch (err) {
      console.error(`Failed to fetch details for course ${courseId}`, err);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [courseId]: false }));
    }
  }

  const getSubmission = (studentId, workId, submissions) => {
    return submissions.find(s => s.userId === studentId && s.courseWorkId === workId);
  }

  const getSubmissionText = (sub, cw) => {
    const isGraded = cw && cw.maxPoints > 0;

    if (!sub) {
        return isGraded ? "" : <i className="bi bi-dash-circle text-danger opacity-50" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
    }
    
    // Om betyg finns (och är satt), visa det
    if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
        return <span className="fw-bold" title={`Betyg: ${sub.assignedGrade}`}>{sub.assignedGrade}</span>;
    }

    // Om det är ett prov (med poäng), visa inga ikoner för tillstånd
    if (isGraded) return "";

    // Annars visa ikon baserat på status för vanliga uppgifter
    switch (sub.state) {
        case 'TURNED_IN':
            return <i className="bi bi-check text-success fs-6" title="Inlämnad (Väntar på rättning)"></i>;
        case 'RETURNED':
            return <i className="bi bi-check-all text-success fs-6" title="Återlämnad (Klar)"></i>;
        case 'CREATED':
        case 'NEW':
            return ""; // Pennan borttagen enligt önskemål
        case 'RECLAIMED_BY_STUDENT':
            return <i className="bi bi-arrow-counterclockwise text-warning" title="Återtaget av elev"></i>;
        default:
            return <i className="bi bi-dash-circle text-danger opacity-75" style={{ fontSize: '0.8rem' }} title="Ej inlämnad"></i>;
    }
  }

  const getGradeColorByPercent = (percent) => {
      if (percent === null || typeof percent === 'undefined' || percent < 0) return 'inherit';
      if (percent < 50) return '#ffccc7'; 
      if (percent < 70) return '#d9f7be'; 
      if (percent < 90) return '#95de64'; 
      return '#52c41a'; 
  }

  const getCellBackgroundColor = (sub, cw) => {
      const isGraded = cw && cw.maxPoints > 0;

      // 1. Prioritera betyg om det finns (Maxpoäng > 0 och betyg satt)
      if (isGraded && sub && typeof sub.assignedGrade === 'number') {
          const pct = (sub.assignedGrade / cw.maxPoints) * 100;
          return getGradeColorByPercent(pct);
      }

      // 2. Statusbaserad färgning
      if (!sub) {
          return '#ffffff'; 
      }

      switch (sub.state) {
          case 'RETURNED':
              return '#d9f7be'; // Klar (Grön)
          case 'TURNED_IN':
              return '#f6ffed'; // Inlämnad (Ljusgrön/Mint)
          default:
              return '#ffffff'; // Påbörjade (utkast), återtagna eller saknade = Vit bakgrund
      }
  }

  const calculateAveragePercent = (studentId, submissions, coursework) => {
      if (!coursework || coursework.length === 0) return 0;
      let totalPct = 0;
      let count = 0;
      
      coursework.forEach(cw => {
          if (cw.maxPoints > 0) {
              const sub = submissions.find(s => s.userId === studentId && s.courseWorkId === cw.id);
              let pct = 0;
              if (sub && typeof sub.assignedGrade === 'number') {
                  pct = (sub.assignedGrade / cw.maxPoints) * 100;
              }
              // If no sub or no grade, pct remains 0 (Treat as 0%)
              totalPct += pct;
              count++;
          }
      });
      return count > 0 ? totalPct / count : 0;
  }

  const isStudentAtRisk = (studentId, submissions, groupedWork) => {
      // Risk criterion: Has the student an actual failing grade (Best in topic < 50%)?
      // Ignore topics where no work has been graded yet.
      for (const group of groupedWork) {
          let maxPct = -1;
          let hasGradedSub = false;
          
          for (const cw of group.assignments) {
              if (cw.maxPoints > 0) {
                  const sub = submissions.find(s => s.userId === studentId && s.courseWorkId === cw.id);
                  if (sub && typeof sub.assignedGrade === 'number') {
                      hasGradedSub = true;
                      const pct = (sub.assignedGrade / cw.maxPoints) * 100;
                      if (pct > maxPct) maxPct = pct;
                  }
              }
          }
          // Trigger warning ONLY if they have attempted (graded) but failed to reach 50%
          if (hasGradedSub && maxPct < 50) return true;
      }
      return false;
  }

  const calculateTotalSubmissionCount = (studentId, submissions, groupedWork) => {
      let count = 0;
      groupedWork.forEach(group => {
          group.assignments.forEach(cw => {
              const sub = getSubmission(studentId, cw.id, submissions);
               if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) {
                   count++;
               }
          });
      });
      return count;
  }

  const getSortedStudents = (students, courseId, submissions, groupedWork, coursework) => {
      const sortType = sortConfig[courseId] || 'name-asc';
      const sorted = [...students];
      switch (sortType) {
          case 'name-desc':
              return sorted.sort((a, b) => b.profile.name.fullName.localeCompare(a.profile.name.fullName));
          case 'perf-struggle': 
              // Sort by Lowest Average first
              return sorted.sort((a, b) => calculateAveragePercent(a.userId, submissions, coursework) - calculateAveragePercent(b.userId, submissions, coursework));
          case 'perf-top': 
              // Sort by Highest Average first
              return sorted.sort((a, b) => calculateAveragePercent(b.userId, submissions, coursework) - calculateAveragePercent(a.userId, submissions, coursework));
          case 'submission-desc':
              return sorted.sort((a, b) => calculateTotalSubmissionCount(b.userId, submissions, groupedWork) - calculateTotalSubmissionCount(a.userId, submissions, groupedWork));
          case 'name-asc':
          default:
              return sorted.sort((a, b) => a.profile.name.fullName.localeCompare(b.profile.name.fullName));
      }
  }

  const calculateColumnAverage = (cwId, students, submissions) => {
      let sum = 0, count = 0;
      students.forEach(std => {
          const sub = getSubmission(std.userId, cwId, submissions);
          if (sub && typeof sub.assignedGrade === 'number') {
              sum += sub.assignedGrade;
              count++;
          }
      });
      return count > 0 ? (sum / count).toFixed(1) : '-';
  }
  
  const calculateGroupMaxAverage = (groupId, students, groupAssignments, submissions) => {
       let sum = 0, count = 0;
       students.forEach(std => {
           let max = -1, hasGrade = false;
           groupAssignments.forEach(cw => {
               const sub = getSubmission(std.userId, cw.id, submissions);
               if (sub && typeof sub.assignedGrade === 'number') {
                   hasGrade = true;
                   if (sub.assignedGrade > max) max = sub.assignedGrade;
               }
           });
           if (hasGrade) {
               sum += max;
               count++;
           }
       });
       return count > 0 ? (sum / count).toFixed(1) : '-';
  }

  const calculateGroupSummaryFooter = (group, students, submissions) => {
      if (showGraded) {
          return calculateGroupMaxAverage(group.id, students, group.assignments, submissions);
      } else {
          // Calculate average count of submissions
          let totalCount = 0;
          let studentCount = 0;
          students.forEach(std => {
              let count = 0;
              group.assignments.forEach(cw => {
                  const sub = getSubmission(std.userId, cw.id, submissions);
                   if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) {
                       count++;
                   }
              });
              totalCount += count;
              studentCount++;
          });
          return studentCount > 0 ? (totalCount / studentCount).toFixed(1) : '-';
      }
  }

  const downloadCSV = (courseId, courseName, groupedWork, students, submissions) => {
      const headerRow = ['Elev'];
      groupedWork.forEach(g => {
          g.assignments.forEach(cw => headerRow.push(`[${g.name}] ${cw.title}`));
          headerRow.push(`[${g.name}] MAX`);
      });
      const bodyRows = students.map(std => {
          const row = [`"${std.profile.name.fullName}"`];
          groupedWork.forEach(g => {
               let max = -1, hasGrade = false;
               g.assignments.forEach(cw => {
                   const sub = getSubmission(std.userId, cw.id, submissions);
                   row.push(sub && typeof sub.assignedGrade !== 'undefined' ? sub.assignedGrade : '');
                   if (sub && typeof sub.assignedGrade === 'number') {
                       hasGrade = true;
                       if (sub.assignedGrade > max) max = sub.assignedGrade;
                   }
               });
               row.push(hasGrade ? max : '');
          });
          return row.join(',');
      });
      const csvContent = [headerRow.join(','), ...bodyRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${courseName}_matrix.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  const handleLogin = () => { window.location.href = '/auth/google'; }
  const handleLogout = async () => {
      try {
          await axios.post('/api/logout');
          setIsLoggedIn(false); setCourses([]); setCourseDetails({}); localStorage.clear(); 
      } catch (err) { console.error("Logout failed", err); }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (!selectedStudent || !selectedCourseId) return;
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        const details = courseDetails[selectedCourseId];
        if (!details) return;
        // groupedWork is complex to reconstruct here, passing [] is a compromise for keyboard nav stability
        const sorted = getSortedStudents(details.students, selectedCourseId, details.submissions, [], details.coursework);
        const idx = sorted.findIndex(s => s.userId === selectedStudent);
        if (idx !== -1) {
            let newIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
            if (newIdx >= 0 && newIdx < sorted.length) {
                e.preventDefault();
                const newStudentId = sorted[newIdx].userId;
                setSelectedStudent(newStudentId);
                setTimeout(() => {
                    const el = document.getElementById(`row-${newStudentId}`);
                    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 0);
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudent, selectedCourseId, courseDetails, sortConfig]);

  if (loading) return (
      <div className="d-flex justify-content-center align-items-center vh-100">
          <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Laddar...</span></div>
      </div>
  );

  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const details = currentCourse ? courseDetails[currentCourse.id] : null;
  const filterText = (currentCourse && assignmentFilters[currentCourse.id]) || '';
  
  let groupedWork = [];
  let sortedStudents = [];
  const maxSubmissionsPerGroup = {};

  if (details) {
       const visibleCoursework = details.coursework.filter(cw => {
           const matchesText = cw.title.toLowerCase().includes(filterText.toLowerCase());
           const isGraded = cw.maxPoints && cw.maxPoints > 0;
           const matchesType = (isGraded && showGraded) || (!isGraded && showUngraded);
           
           let matchesPending = true;
           if (showPending) {
               matchesPending = details.submissions.some(s => s.courseWorkId === cw.id && s.state === 'TURNED_IN');
           }

           return matchesText && matchesType && matchesPending;
       });
       const topicMap = new Map();
       details.topics?.forEach(t => topicMap.set(t.topicId, t.name));
       const groups = {}; 
       const noTopic = [];
       visibleCoursework.forEach(cw => {
           if (cw.topicId) {
               if (!groups[cw.topicId]) groups[cw.topicId] = [];
               groups[cw.topicId].push(cw);
           } else { noTopic.push(cw); }
       });
       if (details.topics) {
           details.topics.forEach(t => {
               if (groups[t.topicId]) {
                   groupedWork.push({ id: t.topicId, name: t.name, assignments: groups[t.topicId] });
                   delete groups[t.topicId];
               }
           });
       }
       Object.keys(groups).forEach(tid => {
            groupedWork.push({ id: tid, name: topicMap.get(tid) || 'Okänt Ämne', assignments: groups[tid] });
       });
                     groupedWork.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                     if (noTopic.length > 0) groupedWork.push({ id: 'none', name: 'Övrigt', assignments: noTopic });
                     sortedStudents = getSortedStudents(details.students, selectedCourseId, details.submissions, groupedWork, details.coursework);
                     
                     // Pre-calculate max submissions per group for relative coloring
                     if (details && groupedWork.length > 0) {
                         groupedWork.forEach(group => {
                             let max = 0;
                             details.students.forEach(student => {
                                 let count = 0;
                                 group.assignments.forEach(cw => {
                                     const sub = getSubmission(student.userId, cw.id, details.submissions);
                                     if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) {
                                         count++;
                                     }
                                 });
                                 if (count > max) max = count;
                             });
                             maxSubmissionsPerGroup[group.id] = max;
                         });
                     }
                }       
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
                           
                           <select className="form-select form-select-sm fw-bold border-primary" style={{ maxWidth: '300px' }} value={selectedCourseId} onChange={(e) => handleCourseChange(e.target.value)}>
                               <option value="">Alla klassrum (Todo)</option>
                               {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                           {currentCourse && <a href={currentCourse.alternateLink} target="_blank" rel="noreferrer" className="btn btn-link btn-sm text-decoration-none" title="Öppna i Classroom"><i className="bi bi-box-arrow-up-right"></i></a>}
                       </div>
                       <div className="d-flex align-items-center gap-2">
                           <div className="text-muted small d-none d-md-block me-1">
                               {currentView === 'todo' ? (
                                   lastUpdated['todo'] && <span>Uppdaterad {lastUpdated['todo']}</span>
                               ) : (
                                   lastUpdated[selectedCourseId] && <span>Uppdaterad {lastUpdated[selectedCourseId]}</span>
                               )}
                           </div>
                           <button onClick={() => {
                               if (currentView === 'matrix') fetchCourseDetails(selectedCourseId, true);
                               else if (currentView === 'stream') fetchStreamData(selectedCourseId, true);
                               else if (currentView === 'todo') setTodoRefreshTrigger(prev => prev + 1);
                           }} 
                           disabled={currentView === 'matrix' ? loadingDetails[selectedCourseId] : currentView === 'stream' ? streamLoading : false} 
                           className="btn btn-outline-secondary btn-sm" 
                           title="Hämta senaste data från Google Classroom"
                           >
                               <i className={`bi bi-arrow-clockwise ${currentView === 'matrix' ? (loadingDetails[selectedCourseId] ? 'spinner-border spinner-border-sm border-0' : '') : streamLoading ? 'spinner-border spinner-border-sm border-0' : ''}`}></i>
                           </button>
                           <button onClick={handleLogout} className="btn btn-light btn-sm text-danger" title="Logga ut"><i className="bi bi-power"></i></button>
                       </div>
                   </header>

                   {/* Sub-header / Toolbar for View Specific Controls */}
                   {(currentView === 'matrix' || currentView === 'stream') && selectedCourseId && (
                       <div className="bg-white border-bottom px-4 py-1 d-flex align-items-center shadow-sm" style={{ minHeight: '45px', zIndex: 5 }}>
                           {currentView === 'matrix' && (
                               <div className="d-flex align-items-center w-100 justify-content-between">
                                   <div className="d-flex align-items-center gap-3">
                                       <div className="input-group input-group-sm" style={{ width: '200px' }}>
                                            <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                                            <input type="text" className="form-control border-start-0 ps-0" placeholder="Filtrera uppgifter..." value={filterText} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, [selectedCourseId]: e.target.value }))} />
                                       </div>
                                       <div className="vr h-50 opacity-25"></div>
                                       <div className="d-flex align-items-center gap-3">
                                            <div className="form-check form-check-inline m-0" title="Visa/dölj prov och uppgifter med poäng">
                                                <input className="form-check-input" type="checkbox" id="checkGraded" checked={showGraded} onChange={e => setShowGraded(e.target.checked)} />
                                                <label className="form-check-label small fw-bold" htmlFor="checkGraded">Prov</label>
                                            </div>
                                            <div className="form-check form-check-inline m-0" title="Visa/dölj uppgifter utan poäng">
                                                <input className="form-check-input" type="checkbox" id="checkUngraded" checked={showUngraded} onChange={e => setShowUngraded(e.target.checked)} />
                                                <label className="form-check-label small fw-bold" htmlFor="checkUngraded">Uppg.</label>
                                            </div>
                                            <div className="form-check form-check-inline m-0" title="Visa endast uppgifter med inlämningar att rätta">
                                                <input className="form-check-input" type="checkbox" id="checkPending" checked={showPending} onChange={e => setShowPending(e.target.checked)} />
                                                <label className="form-check-label small fw-bold text-danger" htmlFor="checkPending">Att rätta</label>
                                            </div>
                                       </div>
                                       <div className="vr h-50 opacity-25"></div>
                                       <select onChange={(e) => setSortConfig(prev => ({ ...prev, [selectedCourseId]: e.target.value }))} value={sortConfig[selectedCourseId] || 'name-asc'} className="form-select form-select-sm border-0 fw-bold text-primary bg-transparent" style={{ width: '140px' }} title="Sortera elever">
                                            <option value="name-asc">Sortera: A-Ö</option>
                                            <option value="name-desc">Sortera: Ö-A</option>
                                            <option value="perf-struggle">Sortera: Varning</option>
                                            <option value="perf-top">Sortera: Bäst</option>
                                            <option value="submission-desc">Sortera: Mest gjort</option>
                                        </select>
                                   </div>
                                   <button onClick={() => downloadCSV(selectedCourseId, currentCourse.name, groupedWork, details.students, details.submissions)} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold" title="Exportera till CSV (Excel)">
                                       <i className="bi bi-file-earmark-spreadsheet fs-6"></i> EXPORTERA EXCEL
                                   </button>
                               </div>
                           )}
                           {currentView === 'stream' && (
                               <div className="d-flex align-items-center w-100 justify-content-end">
                                    <button onClick={handleExportLogbook} className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 border-0 fw-bold" title="Ladda ner som Markdown-fil">
                                        <i className="bi bi-file-text fs-6"></i> EXPORTERA LOGGBOK
                                    </button>
                               </div>
                           )}
                       </div>
                   )}
       
                   <main className="flex-grow-1 overflow-hidden d-flex flex-column position-relative bg-white">
                       {currentView === 'todo' ? (
                           <div className="flex-grow-1 overflow-auto bg-light">
                               <TodoView 
                                    selectedCourseId={selectedCourseId} 
                                    refreshTrigger={todoRefreshTrigger} 
                                    onUpdate={(time) => setLastUpdated(prev => ({ ...prev, todo: time }))}
                                />
                           </div>
                       ) : currentView === 'stream' ? (
                           <div className="flex-grow-1 overflow-auto bg-light">
                               {selectedCourseId ? (
                                   <StreamView 
                                       courseId={selectedCourseId}
                                       announcements={streamAnnouncements}
                                       notes={streamNotes}
                                       loading={streamLoading}
                                       error={streamError}
                                       onRefresh={() => fetchStreamData(selectedCourseId)}
                                       onSaveNote={handleSaveNote}
                                   />
                               ) : <div className="p-5 text-center text-muted">Välj ett klassrum ovan</div>}
                           </div>
                       ) : selectedCourseId && details ? (
                           <div className="flex-grow-1 overflow-auto matrix-wrapper border-0 rounded-0 h-100">
                                <table className="table table-sm table-hover mb-0 matrix-table">
                                       <thead>
                                           <tr>
                                               <th className="sticky-corner-1 align-middle ps-3">ELEV</th>
                                               {groupedWork.map(group => {
                                                   const isExpanded = expandedTopics[selectedCourseId]?.[group.id];
                                                   return (
                                                   <th key={group.id} colSpan={isExpanded ? group.assignments.length + 1 : 1} onClick={() => toggleTopic(selectedCourseId, group.id)} className="sticky-header-topic text-center px-1" style={{ cursor: 'pointer', maxWidth: isExpanded ? 'none' : '80px' }} title={`Klicka för att visa/dölja: ${group.name}`}>
                                                       <div className="d-flex align-items-center justify-content-center gap-1">
                                                            <i className={`bi bi-${isExpanded ? 'dash-square' : 'plus-square'} small opacity-50 flex-shrink-0`}></i>
                                                            <span className="text-truncate" style={{ display: 'block' }}>{group.name}</span>
                                                       </div>
                                                   </th>
                                               );
                                               })}
                                           </tr>
                                           <tr>
                                               <th className="sticky-corner-2 ps-3 text-start"><small className="text-muted fw-normal">{sortedStudents.length} st</small></th>
                                               {groupedWork.map(group => {
                                                   const isExpanded = expandedTopics[selectedCourseId]?.[group.id];
                                                   return (
                                                   <React.Fragment key={group.id}>
                                                       {isExpanded && group.assignments.map((cw, idx) => (
                                                           <th key={cw.id} className="sticky-header-assign" style={{ 
                                                               borderLeft: idx === 0 ? '2px solid #dee2e6' : '1px solid #dee2e6', 
                                                               minWidth: '80px', maxWidth: '80px', width: '80px', 
                                                               fontSize: '0.65rem', backgroundColor: '#f8f9fa', 
                                                               padding: '2px',
                                                               height: '2.4rem', // Fixad höjd för 2 rader
                                                               verticalAlign: 'top'
                                                           }} title={cw.title}>
                                                               <div style={{ 
                                                                   display: '-webkit-box', 
                                                                   WebkitLineClamp: '2', 
                                                                   WebkitBoxOrient: 'vertical', 
                                                                   overflow: 'hidden', 
                                                                   lineHeight: '1.1',
                                                                   wordBreak: 'break-word',
                                                                   whiteSpace: 'normal'
                                                               }}>
                                                                   <a href={cw.alternateLink} target="_blank" rel="noreferrer" className="text-decoration-none text-muted">{cw.title}</a>
                                                               </div>
                                                           </th>
                                                       ))}
                                                       <th className="sticky-header-assign text-center" style={{ borderLeft: '3px solid #adb5bd', minWidth: '80px', maxWidth: '80px', width: '80px', color: '#212529', fontWeight: 'bold', fontSize: '0.8rem', backgroundColor: '#f8f9fa' }} title="Bästa betyg (Max)">
                                                           <i className="bi bi-bag-check text-muted" style={{ fontSize: '0.9rem' }}></i>
                                                       </th>
                                                   </React.Fragment>
                                               );
                                               })}
                                           </tr>
                                       </thead>
                                       <tbody>
                                           {sortedStudents.map((student, index) => {
                                               const atRisk = isStudentAtRisk(student.userId, details.submissions, groupedWork);
                                               return (
                                               <tr key={student.userId} id={`row-${student.userId}`} className={selectedStudent === student.userId ? 'selected-row' : ''}>
                                                   <td className="sticky-col-student align-middle ps-3" onClick={() => setSelectedStudent(selectedStudent === student.userId ? null : student.userId)} style={{ cursor: 'pointer', fontSize: '0.8rem' }} title="Klicka för att markera rad">
                                                       <div className="d-flex align-items-center">
                                                           <span className="text-muted small me-2" style={{minWidth: '20px', display: 'inline-block'}}>{index + 1}.</span>
                                                           <span className="text-truncate me-2">{student.profile.name.fullName}</span>
                                                           {atRisk && <i className="bi bi-exclamation-triangle-fill text-danger" title="Varning: Minst ett ämne underkänt (<50%)"></i>}
                                                       </div>
                                                   </td>
                                            {groupedWork.map(group => {
                                                const isExpanded = expandedTopics[selectedCourseId]?.[group.id];
                                                let maxGrade = -1, maxGradePercent = -1, hasGrade = false;
                                                const cells = group.assignments.map((cw, idx) => {
                                                    const sub = getSubmission(student.userId, cw.id, details.submissions);
                                                    let pct = -1;
                                                    if (sub && typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
                                                        hasGrade = true;
                                                        if (cw.maxPoints > 0) {
                                                            pct = (sub.assignedGrade / cw.maxPoints) * 100;
                                                            if (pct > maxGradePercent) maxGradePercent = pct;
                                                        }
                                                        if (sub.assignedGrade > maxGrade) maxGrade = sub.assignedGrade;
                                                    }
                                                    if (!isExpanded) return null;
                                                    const cellColor = getCellBackgroundColor(sub, cw);
                                                    return (
                                                        <td key={cw.id} className="grade-cell text-center p-0 position-relative" style={{ borderLeft: idx === 0 ? '2px solid #dee2e6' : '1px solid #dee2e6', backgroundColor: cellColor, color: pct >= 90 ? 'white' : 'inherit', fontSize: '0.75rem' }}>
                                                            <a href={sub?.alternateLink || cw.alternateLink} target="_blank" rel="noreferrer" className="grade-link w-100 h-100 d-flex align-items-center justify-content-center text-decoration-none text-reset">{getSubmissionText(sub, cw)}</a>
                                                        </td>
                                                    );
                                                });
                                                const maxColor = getGradeColorByPercent(maxGradePercent);
                                                
                                                // Check for pending reviews (TURNED_IN)
                                                const hasPendingReview = group.assignments.some(cw => {
                                                    const sub = getSubmission(student.userId, cw.id, details.submissions);
                                                    return sub && sub.state === 'TURNED_IN';
                                                });

                                                let summaryContent = '-';
                                                let summaryStyle = { 
                                                    borderLeft: '3px solid #adb5bd', 
                                                    fontSize: '0.8rem',
                                                    backgroundColor: '#f8f9fa' 
                                                };
                                                let summaryTitle = "";
                                                
                                                if (showGraded) {
                                                    summaryStyle.backgroundColor = maxColor;
                                                    summaryStyle.color = maxGradePercent >= 90 ? 'white' : 'inherit';
                                                    summaryContent = hasGrade ? maxGrade : '-';
                                                    summaryTitle = hasGrade ? `Bästa resultat: ${maxGrade}` : "";
                                                } else {
                                                    let turnInCount = 0;
                                                    group.assignments.forEach(cw => {
                                                        const sub = getSubmission(student.userId, cw.id, details.submissions);
                                                        if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) {
                                                            turnInCount++;
                                                        }
                                                    });
                                                    
                                                    const maxInThisGroup = maxSubmissionsPerGroup[group.id] || 0;
                                                    // Relative percentage based on the best student in this group (relative grading)
                                                    const submissionPct = maxInThisGroup > 0 ? (turnInCount / maxInThisGroup) * 100 : 0;
                                                    
                                                    summaryStyle.backgroundColor = getGradeColorByPercent(submissionPct);
                                                    summaryStyle.color = submissionPct >= 90 ? 'white' : 'inherit';
                                                    summaryContent = turnInCount;
                                                    summaryTitle = `Inlämningar: ${turnInCount}`;
                                                }

                                                if (hasPendingReview) {
                                                    summaryTitle += (summaryTitle ? " | " : "") + "Att rätta!";
                                                }

                                                return (
                                                    <React.Fragment key={group.id}>
                                                        {cells}
                                                        <td className="text-center fw-bold align-middle" style={summaryStyle} title={summaryTitle}>
                                                            <div className="d-flex align-items-center justify-content-center gap-1">
                                                                {summaryContent}
                                                                {hasPendingReview && showPending && <i className="bi bi-check-circle text-muted" style={{ fontSize: '0.7rem' }}></i>}
                                                            </div>
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="footer-row">
                                        <td className="sticky-col-student text-end pe-3" style={{ borderTop: '2px solid #343a40' }}>Snitt</td>
                                        {groupedWork.map(group => {
                                            const isExpanded = expandedTopics[selectedCourseId]?.[group.id];
                                            return (
                                                <React.Fragment key={group.id}>
                                                    {isExpanded && group.assignments.map((cw, idx) => (
                                                        <td key={cw.id} className="text-center" style={{ borderLeft: idx === 0 ? '2px solid #343a40' : '1px solid #dee2e6', borderTop: '2px solid #343a40', fontSize: '0.7rem' }}>
                                                            {calculateColumnAverage(cw.id, details.students, details.submissions)}
                                                        </td>
                                                    ))}
                                                     <td className="text-center fw-bold" style={{ borderLeft: '3px solid #adb5bd', borderTop: '2px solid #343a40', fontSize: '0.75rem', backgroundColor: '#f8f9fa' }}>
                                                            {calculateGroupSummaryFooter(group, details.students, details.submissions)}
                                                        </td>
                                                </React.Fragment>
                                            )
                                        })}
                                    </tr>
                                </tfoot>
                            </table>
                    </div>
                ) : (
                    <div className="d-flex justify-content-center align-items-center flex-grow-1 text-muted">
                        {loadingDetails[selectedCourseId] ? (
                            <div className="text-center"><div className="spinner-border text-primary mb-2" role="status"></div><div>Hämtar data från Classroom...</div></div>
                        ) : (
                            <div><i className="bi bi-arrow-up-circle fs-1 d-block text-center mb-2 opacity-25"></i>Välj ett klassrum i listan ovan</div>
                        )}
                    </div>
                )}
            </main>
        </>
      )}
    </div>
  )
}

export default App