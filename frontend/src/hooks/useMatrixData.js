import { useState, useEffect } from 'react';
import axios from 'axios';
import { dbGet, dbSet } from '../db';

/**
 * Custom hook to handle fetching and caching matrix data for a course.
 */
export const useMatrixData = (courseId, refreshTrigger, onUpdate, onLoading) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const setLocalLoading = (val) => {
        setLoading(val);
        if (onLoading) onLoading(val);
    };

    const fetchDetails = async (id, force = false) => {
        if (!id) return;
        setLocalLoading(true);
        setError(null);
        try {
            const res = await axios.get(`/api/courses/${id}/details`);
            const now = Date.now();
            setDetails(res.data);
            
            const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (onUpdate) onUpdate(timeStr);
            
            await dbSet(`course_cache_${id}`, {
                timestamp: now,
                data: res.data
            });
        } catch (err) {
            console.error("Failed to fetch matrix details", err);
            setError("Kunde inte hämta data från Google Classroom.");
        } finally {
            setLocalLoading(false);
        }
    };

    // Load from cache on mount or course change
    useEffect(() => {
        const loadCache = async () => {
            if (!courseId) return;
            setLocalLoading(true);
            try {
                const cacheKey = `course_cache_${courseId}`;
                const cached = await dbGet(cacheKey);
                if (cached) {
                    setDetails(cached.data);
                    if (onUpdate && cached.timestamp) {
                        onUpdate(new Date(cached.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    }
                } else {
                    await fetchDetails(courseId);
                }
            } catch (err) {
                console.warn("Matrix cache load failed", err);
                await fetchDetails(courseId);
            } finally {
                setLocalLoading(false);
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

    return { details, loading, error, refetch: () => fetchDetails(courseId, true) };
};
