import { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbSet, dbGetAllKeys } from '../db';

// Helper to transform course details into todo format
export const transformDetailsToTodo = (courseId, details) => {
    if (!details || !details.coursework) return null;
    
    const topicsMap = new Map(details.topics?.map(t => [String(t.topicId), t.name]));
    const categoryMap = new Map(details.gradeCategories?.map(gc => [String(gc.id), gc.name]));
    const studentMap = new Map(details.students?.map(s => [s.userId, s.profile]));

    // Fetch course name if missing (try to find it in cache keys or just generic)
    // Ideally details should have it now after backend fix
    const courseName = details.courseName || 'Kurs ' + courseId;

    const todoItems = (details.submissions || []).map(sub => {
        const student = studentMap.get(sub.userId);
        const work = details.coursework.find(cw => cw.id === sub.courseWorkId);
        if (!student || !work) return null;

        const topicId = work.topicId ? String(work.topicId) : null;

        return {
            id: sub.id,
            courseId: courseId,
            courseName: courseName,
            courseSection: details.courseSection || '',
            workId: sub.courseWorkId,
            workTitle: work.title,
            topicId: topicId,
            topicName: topicId ? (topicsMap.get(topicId) || 'Övrigt') : 'Övrigt',
            categoryName: work.gradeCategoryId ? categoryMap.get(String(work.gradeCategoryId)) : null,
            studentId: sub.userId,
            studentName: student.name.fullName,
            studentPhoto: student.photoUrl,
            studentClass: student.studentClass || '',
            updateTime: sub.updateTime,
            late: sub.late,
            state: sub.state,
            assignedGrade: sub.assignedGrade,
            maxPoints: work.maxPoints
        };
    }).filter(Boolean);

    return {
        courseId,
        courseName: courseName,
        studentCount: details.students?.length || 0,
        todos: todoItems
    };
};

export const useTodoData = (selectedCourseId, refreshTrigger, onUpdate, onLoading) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const setLocalLoading = (val, background = false) => {
        if (!background) setLoading(val);
        else setIsRefreshing(val);
        if (onLoading) onLoading(val);
    };

    // Load initial data from IndexedDB
    useEffect(() => {
        const loadCache = async () => {
            setLocalLoading(true);
            try {
                // 1. Get the global aggregated cache
                let cached = await dbGet('todo_cache_data') || [];
                
                // 2. Scan for individual course caches to supplement
                const keys = await dbGetAllKeys();
                const courseKeys = keys.filter(k => k.startsWith('course_cache_'));
                
                const reconstructedData = [];
                for (const key of courseKeys) {
                    const cid = key.replace('course_cache_', '');
                    // Skip if we already have fresh data for this in global cache
                    if (cached.some(c => String(c.courseId) === cid)) continue;

                    const details = await dbGet(key);
                    if (details && details.data) {
                        const transformed = transformDetailsToTodo(cid, details.data);
                        if (transformed) reconstructedData.push(transformed);
                    }
                }

                const finalData = [...cached, ...reconstructedData];
                setData(finalData);

                const savedTime = await dbGet('todo_cache_timestamp');
                if (savedTime && onUpdate) onUpdate(savedTime);
                else if (reconstructedData.length > 0 && onUpdate) {
                    onUpdate("Cachad");
                }
            } catch (err) {
                console.warn("Could not load Todo cache", err);
            } finally {
                setLocalLoading(false);
            }
        };
        loadCache();
    }, []);

    // Fetch Logic
    const fetchTodos = async (isBackground = false) => {
        setLocalLoading(true, isBackground);
        try {
            const res = await axios.get('/api/todos');
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            setData(res.data);
            setError(null);
            
            await dbSet('todo_cache_data', res.data);
            await dbSet('todo_cache_timestamp', now);
            
            if (onUpdate) onUpdate(now);

            // Report stats
            const totalCount = res.data.reduce((acc, curr) => acc + (curr.todos?.length || 0), 0);
            onLoading({ loading: false, message: `Global synk klar: ${totalCount} uppgifter hämtade från ${res.data.length} klassrum.` });
        } catch (err) {
            console.error("Failed to fetch todos", err);
            if (data.length === 0) setError("Kunde inte hämta att-göra-listan.");
            onLoading({ loading: false, message: 'Synkning misslyckades.' });
        } finally {
            setLocalLoading(false, isBackground);
        }
    };

    const fetchSingleCourseTodo = async (courseId, force = false) => {
        if (!courseId) return;
        setLocalLoading(true, true); // Always background for single course sync
        try {
            // If force is true, trigger the main backend sync first
            if (force) {
                const syncRes = await axios.get(`/api/courses/${courseId}/details?refresh=true`);
                
                // Update the UNIFIED cache so Matrix and Stream views are in sync
                await dbSet(`course_cache_${courseId}`, {
                    timestamp: Date.now(),
                    data: syncRes.data
                });
            }

            const res = await axios.get(`/api/courses/${courseId}/todos`);
            const newData = res.data;

            setData(prevData => {
                const existingIndex = prevData.findIndex(c => c.courseId === courseId);
                let nextData = [...prevData];
                
                if (newData) {
                    if (existingIndex >= 0) nextData[existingIndex] = newData;
                    else nextData.push(newData);
                } else {
                    if (existingIndex >= 0) nextData.splice(existingIndex, 1);
                }
                
                dbSet('todo_cache_data', nextData);
                return nextData;
            });

            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (onUpdate) onUpdate(now);

            const todoCount = newData?.todos?.length || 0;
            onLoading({ loading: false, message: `Synkade ${todoCount} uppgifter för ${newData?.courseName || 'kursen'}.` });

        } catch (err) {
            console.error("Failed to update single course", err);
            onLoading({ loading: false, message: 'Synkning misslyckades.' });
        } finally {
            setLocalLoading(false, true);
        }
    };

    // Trigger effect
    useEffect(() => {
        if (refreshTrigger > 0) {
            if (selectedCourseId) fetchSingleCourseTodo(selectedCourseId, true);
            else fetchTodos(true);
        }
    }, [refreshTrigger]);

    return { 
        data, 
        loading, 
        isRefreshing, 
        error, 
        refetch: () => fetchTodos(true),
        syncCourse: (id) => fetchSingleCourseTodo(id, true)
    };
};
