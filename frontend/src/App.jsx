import React, { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [courses, setCourses] = useState([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [courseDetails, setCourseDetails] = useState({}) // { [courseId]: { students, coursework, submissions } }
  const [loadingDetails, setLoadingDetails] = useState({}) // { [courseId]: boolean }
  const [expandedCourses, setExpandedCourses] = useState({}) // { [courseId]: boolean }
  const [assignmentFilters, setAssignmentFilters] = useState({}) // { [courseId]: string }
  const [expandedTopics, setExpandedTopics] = useState({}) // { [courseId]: { [topicId]: boolean } }

  // Tillåt cookies i axios-anrop
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
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  }

  const toggleCourse = async (courseId) => {
      if (expandedCourses[courseId]) {
          setExpandedCourses(prev => ({ ...prev, [courseId]: false }));
      } else {
          if (!courseDetails[courseId]) {
              await fetchCourseDetails(courseId);
          }
          setExpandedCourses(prev => ({ ...prev, [courseId]: true }));
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
    if (!forceUpdate && courseDetails[courseId]) return; // Redan laddat, hoppa över om inte tvingad

    setLoadingDetails(prev => ({ ...prev, [courseId]: true }));
    try {
      const res = await axios.get(`/api/courses/${courseId}/details`);
      setCourseDetails(prev => ({ ...prev, [courseId]: res.data }));
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
    if (!sub) return '-';
    if (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
        return sub.assignedGrade;
    }
    return sub.state === 'TURNED_IN' ? 'Inlämnad' : 
           sub.state === 'RETURNED' ? 'Återlämnad' :
           sub.state === 'NEW' ? '' : // Ej påbörjad
           sub.state;
  }

  const getGradeColor = (sub) => {
      if (!sub || typeof sub.assignedGrade === 'undefined' || sub.assignedGrade === null) return 'inherit';
      const score = sub.assignedGrade;
      if (score < 10) return '#ffccc7'; // Röd (Ej godkänt)
      if (score < 14) return '#d9f7be'; // Ljusgrön (Godkänt)
      if (score < 16) return '#95de64'; // Mellangrön (Bra)
      return '#52c41a'; // Mörkgrön (Utmärkt)
  }

  const handleLogin = () => {
    window.location.href = '/auth/google';
  }

  const handleLogout = async () => {
      try {
          await axios.post('/api/logout');
          setIsLoggedIn(false);
          setCourses([]);
          setCourseDetails({});
      } catch (err) {
          console.error("Logout failed", err);
      }
  }

  if (loading) return <div>Laddar...</div>

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Google Classroom Status</h1>
        {isLoggedIn && (
            <button onClick={handleLogout} style={{ padding: '5px 15px', cursor: 'pointer' }}>
                Logga ut
            </button>
        )}
      </div>
      
      {!isLoggedIn ? (
        <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          Logga in med Google
        </button>
      ) : (
        <div>
          <h2>Mina Kurser</h2>
          <div style={{ display: 'grid', gap: '20px' }}>
            {courses.length > 0 ? courses.map(course => {
              const details = courseDetails[course.id];
              const filterText = assignmentFilters[course.id] || '';
              const visibleCoursework = details 
                ? details.coursework.filter(cw => cw.title.toLowerCase().includes(filterText.toLowerCase()))
                : [];

              // Group by Topic
              const groupedWork = [];
              if (details) {
                  const topicMap = new Map();
                  details.topics?.forEach(t => topicMap.set(t.topicId, t.name));
                  
                  const groups = {}; // topicId -> array of cw
                  const noTopic = [];

                  visibleCoursework.forEach(cw => {
                      if (cw.topicId) {
                          if (!groups[cw.topicId]) groups[cw.topicId] = [];
                          groups[cw.topicId].push(cw);
                      } else {
                          noTopic.push(cw);
                      }
                  });

                  // Create ordered array of groups based on topic list order (optional, or just keys)
                  // Using topic list order if available to keep classroom order
                  if (details.topics) {
                      details.topics.forEach(t => {
                          if (groups[t.topicId]) {
                              groupedWork.push({
                                  id: t.topicId,
                                  name: t.name,
                                  assignments: groups[t.topicId]
                              });
                              delete groups[t.topicId];
                          }
                      });
                  }
                  // Any remaining groups (if topic list missed some)
                  Object.keys(groups).forEach(tid => {
                       groupedWork.push({
                           id: tid,
                           name: topicMap.get(tid) || 'Okänt Ämne',
                           assignments: groups[tid]
                       });
                  });

                  if (noTopic.length > 0) {
                      groupedWork.push({ id: 'none', name: 'Övrigt', assignments: noTopic });
                  }
              }

              // Flatten for column rendering
              const sortedAssignments = groupedWork.flatMap(g => g.assignments);


              return (
              <div key={course.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#f9f9f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0' }}>{course.name}</h3>
                        <p style={{ margin: 0, color: '#666' }}>{course.section || 'Ingen sektion'}</p>
                    </div>
                    <div>
                        <a href={course.alternateLink} target="_blank" rel="noreferrer" style={{ marginRight: '15px' }}>Öppna i Classroom</a>
                        <button 
                            onClick={() => fetchCourseDetails(course.id, true)}
                            disabled={loadingDetails[course.id]}
                            style={{ padding: '5px 10px', cursor: 'pointer', marginRight: '10px' }}
                        >
                            Uppdatera
                        </button>
                        <button 
                            onClick={() => toggleCourse(course.id)}
                            disabled={loadingDetails[course.id]}
                            style={{ padding: '5px 10px', cursor: 'pointer' }}
                        >
                            {loadingDetails[course.id] ? 'Laddar...' : (expandedCourses[course.id] ? 'Dölj Matris' : 'Visa Matris')}
                        </button>
                    </div>
                </div>

                {/* Course Details Table */}
                {expandedCourses[course.id] && details && (
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <input 
                                type="text" 
                                placeholder="Filtrera uppgifter..." 
                                value={filterText}
                                onChange={(e) => setAssignmentFilters(prev => ({ ...prev, [course.id]: e.target.value }))}
                                style={{ padding: '5px', width: '200px' }}
                            />
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', background: 'white' }}>
                                <thead>
                                    {/* Topic Header Row */}
                                    <tr style={{ background: '#d0d0d0' }}>
                                        <th style={{ border: '1px solid #bbb', padding: '8px' }}></th>
                                        {groupedWork.map(group => {
                                            const isExpanded = expandedTopics[course.id]?.[group.id];
                                            return (
                                            <th 
                                                key={group.id} 
                                                colSpan={isExpanded ? group.assignments.length + 1 : 1} 
                                                onClick={() => toggleTopic(course.id, group.id)}
                                                style={{ 
                                                    border: '1px solid #bbb', 
                                                    borderLeft: '2px solid #666',
                                                    padding: '8px', 
                                                    textAlign: 'center', 
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    userSelect: 'none'
                                                }}
                                                title="Klicka för att visa/dölja uppgifter"
                                            >
                                                {isExpanded ? '[-] ' : '[+] '} {group.name}
                                            </th>
                                        )})}
                                    </tr>
                                    {/* Assignment Header Row */}
                                    <tr style={{ background: '#eee' }}>
                                        <th style={{ border: '1px solid #bbb', padding: '8px', textAlign: 'left', minWidth: '150px' }}>Elev</th>
                                        {groupedWork.map(group => {
                                            const isExpanded = expandedTopics[course.id]?.[group.id];
                                            return (
                                            <React.Fragment key={group.id}>
                                                {isExpanded && group.assignments.map((cw, idx) => (
                                                    <th key={cw.id} style={{ 
                                                        border: '1px solid #bbb', 
                                                        borderLeft: idx === 0 ? '2px solid #666' : '1px solid #bbb',
                                                        padding: '4px', 
                                                        width: '100px',
                                                        maxWidth: '100px',
                                                        fontSize: '10px',
                                                        fontWeight: 'normal',
                                                        lineHeight: '1.2',
                                                        whiteSpace: 'normal',
                                                        wordWrap: 'break-word',
                                                        overflow: 'hidden'
                                                    }} title={cw.title}>
                                                        {cw.title}
                                                    </th>
                                                ))}
                                                {/* Max Grade Header */}
                                                <th key={`max-${group.id}`} style={{ 
                                                    border: '1px solid #bbb', 
                                                    borderLeft: !isExpanded ? '2px solid #666' : '1px solid #bbb',
                                                    padding: '4px', 
                                                    width: '40px',
                                                    background: '#e0e0e0',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    Max
                                                </th>
                                            </React.Fragment>
                                        )})}
                                    </tr>
                                </thead>
                                <tbody>
                                    {details.students.map(student => (
                                        <tr key={student.userId}>
                                            <td style={{ border: '1px solid #bbb', padding: '4px 8px', fontWeight: 'bold' }}>
                                                {student.profile.name.fullName}
                                            </td>
                                            {groupedWork.map(group => {
                                                const isExpanded = expandedTopics[course.id]?.[group.id];
                                                
                                                // Calculate Max Grade for this Group
                                                let maxGrade = -1;
                                                let hasGrade = false;

                                                const cells = group.assignments.map((cw, idx) => {
                                                    const sub = getSubmission(student.userId, cw.id, details.submissions);
                                                    if (sub && typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null) {
                                                        hasGrade = true;
                                                        if (sub.assignedGrade > maxGrade) maxGrade = sub.assignedGrade;
                                                    }

                                                    if (!isExpanded) return null;

                                                    return (
                                                        <td key={cw.id} style={{ 
                                                            border: '1px solid #bbb', 
                                                            borderLeft: idx === 0 ? '2px solid #666' : '1px solid #bbb',
                                                            padding: '4px 2px', 
                                                            textAlign: 'center',
                                                            width: '100px',
                                                            maxWidth: '100px',
                                                            background: getGradeColor(sub),
                                                            color: (sub && sub.assignedGrade >= 16) ? 'white' : 'black',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {getSubmissionText(sub)}
                                                        </td>
                                                    );
                                                });

                                                const maxSubStub = hasGrade ? { assignedGrade: maxGrade } : null;

                                                return (
                                                    <React.Fragment key={group.id}>
                                                        {cells}
                                                        {/* Max Grade Cell */}
                                                        <td key={`max-cell-${group.id}`} style={{ 
                                                            border: '1px solid #bbb', 
                                                            borderLeft: !isExpanded ? '2px solid #666' : '1px solid #bbb',
                                                            padding: '4px 2px', 
                                                            textAlign: 'center',
                                                            fontWeight: 'bold',
                                                            background: getGradeColor(maxSubStub),
                                                            color: (hasGrade && maxGrade >= 16) ? 'white' : 'black'
                                                        }}>
                                                            {hasGrade ? maxGrade : '-'}
                                                        </td>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {details.students.length === 0 && <p>Inga elever hittades.</p>}
                            {sortedAssignments.length === 0 && <p>Inga uppgifter matchar filtret.</p>}
                        </div>
                    </div>
                )}
              </div>
            )}) : <p>Inga aktiva kurser hittades.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default App