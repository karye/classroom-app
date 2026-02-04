import { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbSet } from '../db';

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
                const cached = await dbGet('todo_cache_data');
                if (cached) {
                    setData(cached);
                    const savedTime = await dbGet('todo_cache_timestamp');
                    if (savedTime && onUpdate) onUpdate(savedTime);
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
        } catch (err) {
            console.error("Failed to fetch todos", err);
            if (data.length === 0) setError("Kunde inte hämta att-göra-listan.");
        } finally {
            setLocalLoading(false, isBackground);
        }
    };

    const fetchSingleCourseTodo = async (courseId) => {
        if (!courseId) return;
        setLocalLoading(true, true);
        try {
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

        } catch (err) {
            console.error("Failed to update single course", err);
        } finally {
            setLocalLoading(false, true);
        }
    };

    // Trigger effect
    useEffect(() => {
        if (refreshTrigger > 0) {
            if (selectedCourseId) fetchSingleCourseTodo(selectedCourseId);
            else fetchTodos(true);
        }
    }, [refreshTrigger]);

    return { 
        data, 
        loading, 
        isRefreshing, 
        error, 
        refetch: () => fetchTodos(true),
        fetchSingleCourseTodo 
    };
};
