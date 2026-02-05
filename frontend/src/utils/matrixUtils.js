import React from 'react';

// --- Basic Helpers ---

export const matchesFilterList = (text, filters) => {
    if (!filters || filters.length === 0 || !text) return false;
    const lowText = text.toLowerCase();
    return filters.some(f => lowText.includes(f.toLowerCase()));
};

export const getSubmission = (details, studentId, workId) => {
    if (!details?.submissions) return null;
    const sub = details.submissions.find(s => String(s.userId) === String(studentId) && String(s.courseWorkId) === String(workId));
    if (!sub) {
        // Optional: log only a few misses to avoid flooding
        // console.log(`[DEBUG] No sub for student ${studentId} on work ${workId}`);
    }
    return sub;
};

// --- Visual Helpers ---

export const getGradeColorByPercent = (percent) => {
    if (percent === null || typeof percent === 'undefined' || percent < 0) return 'inherit';
    if (percent < 50) return 'var(--grade-fail)'; 
    if (percent < 70) return 'var(--grade-pass)'; 
    if (percent < 90) return 'var(--grade-good)'; 
    return 'var(--grade-high)'; 
};

export const getCellBackgroundColor = (sub, cw, showHeatmap) => {
    const isGraded = cw && cw.maxPoints > 0;
    if (isGraded && sub && typeof sub.assignedGrade === 'number') {
        return showHeatmap ? getGradeColorByPercent((sub.assignedGrade / cw.maxPoints) * 100) : '#ffffff';
    }
    if (!sub) return '#ffffff';
    if (sub.state === 'TURNED_IN') return showHeatmap ? 'var(--primary-bg-light)' : '#ffffff';
    return '#ffffff';
};

// --- Analysis Helpers ---

export const calculateAveragePercent = (details, studentId) => {
    if (!details?.coursework) return 0;
    let totalPct = 0, count = 0;
    details.coursework.forEach(cw => {
        if (cw.maxPoints > 0) {
            const sub = getSubmission(details, studentId, cw.id);
            if (sub && typeof sub.assignedGrade === 'number') totalPct += (sub.assignedGrade / cw.maxPoints) * 100;
            count++;
        }
    });
    return count > 0 ? totalPct / count : 0;
};

export const calculateTotalSubmissionCount = (details, studentId, groupedWork) => {
    let count = 0;
    groupedWork.forEach(group => {
        group.assignments.forEach(cw => {
            const sub = getSubmission(details, studentId, cw.id);
             if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) {
                 count++;
             }
        });
    });
    return count;
};

export const isStudentAtRisk = (studentId, submissions, groupedWork) => {
    for (const group of groupedWork) {
        let maxPct = -1, hasGradedSub = false;
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
        if (hasGradedSub && maxPct < 50) return true;
    }
    return false;
};

// --- Data Processing ---

export const processMatrixData = (details, { filterText, assignmentFilter, hideNoDeadline, excludeFilters, excludeTopicFilters }) => {
    if (!details) return { visibleWork: [], groupedWork: [], maxSubmissionsPerGroup: {} };

    // Create a robust map of topics, ensuring IDs are strings
    const topicMap = new Map();
    if (details.topics) {
        details.topics.forEach(t => {
            if (t.topicId) topicMap.set(String(t.topicId), t.name);
        });
    }

    console.log(`[DEBUG] Matrix Utils: Map has ${topicMap.size} topics.`);

    // 1. Filter assignments
    const visibleWork = (details.coursework || []).filter(cw => {
        const matchesText = (cw.title || '').toLowerCase().includes(filterText.toLowerCase());
        const isGraded = cw.maxPoints && cw.maxPoints > 0;
        
        let matchesType = true;
        if (assignmentFilter === 'graded') matchesType = isGraded;
        else if (assignmentFilter === 'ungraded') matchesType = !isGraded;

        const hasDeadline = cw.dueDate && (typeof cw.dueDate === 'string' || cw.dueDate.year);
        const matchesDeadline = !hideNoDeadline || hasDeadline;
        
        const matchesAssignmentExclude = matchesFilterList(cw.title, excludeFilters);
        const matchesTopicExclude = matchesFilterList(topicMap.get(String(cw.topicId)), excludeTopicFilters);
        
        return matchesText && matchesType && matchesDeadline && !matchesAssignmentExclude && !matchesTopicExclude;
    });

    // 2. Group by topic
    const groupedWork = [];
    const groups = {};
    const noTopic = [];
    
    visibleWork.forEach(cw => {
        const tid = cw.topicId ? String(cw.topicId) : null;
        
        if (tid && topicMap.has(tid)) {
            if (!groups[tid]) groups[tid] = [];
            groups[tid].push(cw);
        } else {
            // Log why it didn't match if it has a topicId
            if (cw.topicId) {
                console.log(`[DEBUG] Assignment "${cw.title}" has topicId "${cw.topicId}" but it wasn't found in topicMap.`);
            }
            noTopic.push(cw);
        }
    });

    // Sort and construct the final groupedWork array
    if (details.topics) {
        details.topics.forEach(t => { 
            const tid = String(t.topicId);
            if (groups[tid]) { 
                groupedWork.push({ id: tid, name: t.name, assignments: groups[tid] }); 
                delete groups[tid]; 
            } 
        });
    }

    // Add any remaining groups that might have been missed
    Object.entries(groups).forEach(([tid, assignments]) => {
        groupedWork.push({ id: tid, name: topicMap.get(tid) || 'Okänt Ämne', assignments });
    });

    // Alphabetical sort of topics
    groupedWork.sort((a, b) => a.name.localeCompare(b.name, 'sv', { numeric: true }));
    
    // Always put "Other" at the end
    if (noTopic.length > 0) groupedWork.push({ id: 'none', name: 'Övrigt', assignments: noTopic });

    // 3. Max submissions per group (for progress calculation)
    const maxSubmissionsPerGroup = {};
    groupedWork.forEach(group => {
        let max = 0;
        details.students.forEach(std => {
            let count = 0;
            group.assignments.forEach(cw => {
                const sub = getSubmission(details, std.userId, cw.id);
                if (sub && (sub.state === 'TURNED_IN' || sub.state === 'RETURNED' || (typeof sub.assignedGrade !== 'undefined' && sub.assignedGrade !== null))) count++;
            });
            if (count > max) max = count;
        });
        maxSubmissionsPerGroup[group.id] = max;
    });

    return { visibleWork, groupedWork, maxSubmissionsPerGroup };
};
