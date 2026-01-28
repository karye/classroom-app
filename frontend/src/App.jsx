import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
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

  axios.defaults.withCredentials = true;

  useEffect(() => {
    checkLoginStatus();
  }, [])

  const checkLoginStatus = async () => {
    try {
      const res = await axios.get('/api/user');
      setIsLoggedIn(res.data.loggedIn);
      if (res.data.loggedIn) {
        fetchCourses();
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
      if (res.data.length > 0 && !selectedCourseId) {
          handleCourseChange(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  }

  const handleCourseChange = (courseId) => {
      setSelectedCourseId(courseId);
      if (courseId && !courseDetails[courseId]) {
          fetchCourseDetails(courseId);
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
    const cacheKey = `course_cache_${courseId}`;
    
    if (!forceUpdate && !courseDetails[courseId]) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setCourseDetails(prev => ({ ...prev, [courseId]: parsed.data }));
                if (parsed.timestamp) {
                    setLastUpdated(prev => ({ ...prev, [courseId]: new Date(parsed.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
                }
                return; 
            } catch (e) {
                console.warn("Cache parse failed", e);
            }
        }
    }

    setLoadingDetails(prev => ({ ...prev, [courseId]: true }));
    try {
      const res = await axios.get(`/api/courses/${courseId}/details`);
      const now = Date.now();
      setCourseDetails(prev => ({ ...prev, [courseId]: res.data }));
      setLastUpdated(prev => ({ ...prev, [courseId]: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
      
      localStorage.setItem(cacheKey, JSON.stringify({
          timestamp: now,
          data: res.data
      }));
    } catch (err) {
      console.error(`Failed to fetch details for course ${courseId}`, err);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [courseId]: false }));
    }
  }

  const getSubmission = (studentId, workId, submissions) => {
    return submissions.find(s => s.userId === studentId && s.courseWorkId === workId);
  }

  const getSubmissionText = (sub) => {
    if (!sub) return <i className="bi bi-square text-muted opacity-25" style={{ fontSize: '0.7rem' }}></i>;
    if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
        return sub.assignedGrade;
    }
    return sub.state === 'TURNED_IN' ? <i className="bi bi-check-circle-fill text-primary"></i> : 
           sub.state === 'RETURNED' ? <i className="bi bi-arrow-return-left text-success"></i> : 
           <i className="bi bi-square text-muted opacity-50" style={{ fontSize: '0.7rem' }}></i>;
  }

  const getGradeColorByPercent = (percent) => {
      if (percent === null || typeof percent === 'undefined' || percent < 0) return 'inherit';
      if (percent < 50) return '#ffccc7'; 
      if (percent < 70) return '#d9f7be'; 
      if (percent < 90) return '#95de64'; 
      return '#52c41a'; 
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
           return matchesText && matchesType;
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
                           <div className="d-flex align-items-center gap-2 text-primary">
                                <i className="bi bi-grid-3x3-gap-fill fs-4"></i>
                                <span className="fw-bold fs-5 d-none d-md-block">Matrix</span>
                           </div>
                           <div className="vr mx-2"></div>
                           <select className="form-select form-select-sm fw-bold border-primary" style={{ maxWidth: '300px' }} value={selectedCourseId} onChange={(e) => handleCourseChange(e.target.value)}>
                               <option value="" disabled>Välj klassrum...</option>
                               {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                           {currentCourse && <a href={currentCourse.alternateLink} target="_blank" rel="noreferrer" className="btn btn-link btn-sm text-decoration-none" title="Öppna i Classroom"><i className="bi bi-box-arrow-up-right"></i></a>}
                       </div>
                       <div className="d-flex align-items-center gap-2">
                           {selectedCourseId && (
                           <>
                               <div className="input-group input-group-sm" style={{ width: '200px' }}>
                                    <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                                    <input type="text" className="form-control border-start-0 ps-0" placeholder="Filter..." value={filterText} onChange={(e) => setAssignmentFilters(prev => ({ ...prev, [selectedCourseId]: e.target.value }))} />
                               </div>
                               <div className="d-flex align-items-center gap-2 ms-2 me-3">
                                    <div className="form-check form-check-inline m-0">
                                        <input className="form-check-input" type="checkbox" id="checkGraded" checked={showGraded} onChange={e => setShowGraded(e.target.checked)} />
                                        <label className="form-check-label small" htmlFor="checkGraded">Prov</label>
                                    </div>
                                    <div className="form-check form-check-inline m-0">
                                        <input className="form-check-input" type="checkbox" id="checkUngraded" checked={showUngraded} onChange={e => setShowUngraded(e.target.checked)} />
                                        <label className="form-check-label small" htmlFor="checkUngraded">Uppg.</label>
                                    </div>
                               </div>
                                                         <select onChange={(e) => setSortConfig(prev => ({ ...prev, [selectedCourseId]: e.target.value }))} value={sortConfig[selectedCourseId] || 'name-asc'} className="form-select form-select-sm" style={{ width: '130px' }}>
                                                            <option value="name-asc">A-Ö</option>
                                                            <option value="name-desc">Ö-A</option>
                                                            <option value="perf-struggle">Varning</option>
                                                            <option value="perf-top">Bäst</option>
                                                            <option value="submission-desc">Mest inlämnat</option>
                                                        </select>                               <button onClick={() => fetchCourseDetails(selectedCourseId, true)} disabled={loadingDetails[selectedCourseId]} className="btn btn-outline-secondary btn-sm" title="Uppdatera"><i className={`bi bi-arrow-clockwise ${loadingDetails[selectedCourseId] ? 'spinner-border spinner-border-sm' : ''}`}></i></button>
                               {lastUpdated[selectedCourseId] && <span className="small text-muted" style={{ fontSize: '0.7rem' }}>Uppdaterad: {lastUpdated[selectedCourseId]}</span>}
                               <button onClick={() => downloadCSV(selectedCourseId, currentCourse.name, groupedWork, details.students, details.submissions)} className="btn btn-success btn-sm" title="Exportera Excel"><i className="bi bi-file-earmark-spreadsheet"></i></button>
                               <div className="vr mx-2"></div>
                           </>
                           )}
                           <button onClick={handleLogout} className="btn btn-light btn-sm text-danger"><i className="bi bi-power"></i></button>
                       </div>
                   </header>
       
                   <main className="flex-grow-1 overflow-hidden d-flex flex-column position-relative bg-white">
                       {selectedCourseId && details ? (
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
                                                           <th key={cw.id} className="sticky-header-assign" style={{ borderLeft: idx === 0 ? '2px solid #dee2e6' : '1px solid #dee2e6', minWidth: '80px', maxWidth: '80px', width: '80px', fontSize: '0.6rem', backgroundColor: '#f8f9fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px' }} title={cw.title}>
                                                               <a href={cw.alternateLink} target="_blank" rel="noreferrer" className="text-decoration-none text-muted stretched-link">{cw.title}</a>
                                                           </th>
                                                       ))}
                                                       <th className="sticky-header-assign text-center bg-white" style={{ borderLeft: !isExpanded ? '2px solid #dee2e6' : '1px solid #dee2e6', minWidth: '80px', maxWidth: '80px', width: '80px', color: '#212529', fontWeight: 'bold', fontSize: '0.7rem' }}>Σ</th>
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
                                                   <td className="sticky-col-student align-middle ps-3" onClick={() => setSelectedStudent(selectedStudent === student.userId ? null : student.userId)} style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
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
                                                    const gradeColor = getGradeColorByPercent(pct);
                                                    return (
                                                        <td key={cw.id} className="grade-cell text-center p-0 position-relative" style={{ borderLeft: idx === 0 ? '2px solid #dee2e6' : '1px solid #dee2e6', backgroundColor: gradeColor === 'inherit' ? '#f8f9fa' : gradeColor, color: pct >= 90 ? 'white' : 'inherit', fontSize: '0.75rem' }}>
                                                            <a href={sub?.alternateLink || cw.alternateLink} target="_blank" rel="noreferrer" className="grade-link w-100 h-100 d-flex align-items-center justify-content-center text-decoration-none text-reset">{getSubmissionText(sub)}</a>
                                                        </td>
                                                    );
                                                });
                                                const maxColor = getGradeColorByPercent(maxGradePercent);
                                                
                                                let summaryContent = '-';
                                                let summaryStyle = { borderLeft: !isExpanded ? '2px solid #dee2e6' : '1px solid #dee2e6', fontSize: '0.75rem' };
                                                
                                                if (showGraded) {
                                                    summaryStyle.backgroundColor = maxColor;
                                                    summaryStyle.color = maxGradePercent >= 90 ? 'white' : 'inherit';
                                                    summaryContent = hasGrade ? maxGrade : '-';
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
                                                }

                                                return (
                                                    <React.Fragment key={group.id}>
                                                        {cells}
                                                        <td className="text-center fw-bold align-middle" style={summaryStyle}>
                                                            {summaryContent}
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
                                                     <td className="text-center bg-light" style={{ borderLeft: !isExpanded ? '2px solid #343a40' : '1px solid #dee2e6', borderTop: '2px solid #343a40', fontSize: '0.7rem' }}>
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