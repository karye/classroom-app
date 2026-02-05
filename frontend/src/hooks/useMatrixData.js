import { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbSet } from '../db';

/**
 * Custom hook to handle fetching and caching matrix data for a course.
 */
export const useMatrixData = (courseId, refreshTrigger, onUpdate, onLoading) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const setLocalLoading = (val, background = false) => {
        if (!background) setLoading(val);
        else setIsRefreshing(val);
        
        if (onLoading) {
            if (val) onLoading({ loading: true, message: background ? 'Synkar med Google...' : 'Hämtar data...' });
            else onLoading(false);
        }
    };

    const fetchDetails = async (id, force = false) => {
        if (!id) return;
        setLocalLoading(true, force);
        setError(null);
        try {
            // Append ?refresh=true if we want to force a sync with Google
            const url = `/api/courses/${id}/details${force ? '?refresh=true' : ''}`;
            const res = await axios.get(url);
            const now = Date.now();
            const data = res.data;
            setDetails(data);
            
            const studentCount = data.students?.length || 0;
            const assignCount = data.coursework?.length || 0;
            const annCount = data.announcements?.length || 0;
            const msg = `Hämtat ${studentCount} elever, ${assignCount} uppgifter och ${annCount} inlägg för ${data.courseSection || 'vald kurs'}.`;

            const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (onUpdate) onUpdate(timeStr);
            
            // Unified Cache Entry for all views of this course
            await dbSet(`course_cache_${id}`, {
                timestamp: now,
                data: data
            });

            // Report success with stats
            if (onLoading) onLoading({ loading: false, message: msg });
        } catch (err) {
            console.error("Failed to fetch course details", err);
            setError("Kunde inte hämta data.");
            if (onLoading) onLoading({ loading: false, message: 'Hämtning misslyckades.' });
        } finally {
            setLocalLoading(false, force);
        }
    };

    // Load from cache on mount or course change
    useEffect(() => {
        const loadCache = async () => {
            if (!courseId) return;
            setLocalLoading(true, false);
            try {
                const cacheKey = `course_cache_${courseId}`;
                const cached = await dbGet(cacheKey);
                if (cached) {
                    setDetails(cached.data);
                    if (onUpdate && cached.timestamp) {
                        onUpdate(new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                } else {
                    // No cache - try to fetch what's in the DB already (DO NOT FORCE SYNC)
                    console.log(`[Matrix] No cache for ${courseId}, checking DB...`);
                    await fetchDetails(courseId, false);
                }
            } catch (err) {
                console.warn("Matrix cache load failed", err);
            } finally {
                setLocalLoading(false, false);
            }
        };
        loadCache();
    }, [courseId]);

    // Manual refresh
    useEffect(() => {
        if (refreshTrigger > 0 && courseId) {
            fetchDetails(courseId, true);
        }
    }, [refreshTrigger]);

    return { details, loading, isRefreshing, error, refetch: () => fetchDetails(courseId, true) };
};
