import { useMemo } from 'react';

// Helper
const matchesFilterList = (text, filters) => {
    if (!filters || filters.length === 0 || !text) return false;
    const lowText = text.toLowerCase();
    return filters.some(f => lowText.includes(f.toLowerCase()));
};

export const useTodoFiltering = (data, { selectedCourseId, filterText, assignmentFilter, hideEmptyAssignments, sortType, excludeFilters, excludeTopicFilters }) => {
    
    const filteredData = useMemo(() => selectedCourseId 
        ? data.filter(c => c.courseId === selectedCourseId) 
        : data, [data, selectedCourseId]);

    // 1. Extract assignments
    const allAssignments = useMemo(() => filteredData.flatMap(course => {
        const groups = {};
        course.todos.forEach(todo => {
            if (matchesFilterList(todo.workTitle, excludeFilters)) return;
            if (matchesFilterList(todo.topicName, excludeTopicFilters)) return;

            if (!groups[todo.workId]) {
                groups[todo.workId] = {
                    id: todo.workId,
                    title: todo.workTitle,
                    courseId: course.courseId,
                    courseName: course.courseName,
                    topicId: todo.topicId || 'none',
                    topicName: todo.topicName || 'Övrigt',
                    maxPoints: todo.maxPoints,
                    studentCount: course.studentCount,
                    latestUpdate: 0,
                    pending: [],
                    done: [],
                    other: [],
                    assignments: []
                };
                groups[todo.workId].assignments.push(todo);
            }
            
            if (String(todo.state).trim() === 'TURNED_IN') {
                groups[todo.workId].pending.push(todo);
                if (todo.updateTime) {
                    const time = new Date(todo.updateTime).getTime();
                    if (time > groups[todo.workId].latestUpdate) groups[todo.workId].latestUpdate = time;
                }
            } else if (todo.state === 'RETURNED' || (typeof todo.assignedGrade !== 'undefined' && todo.assignedGrade !== null)) {
                groups[todo.workId].done.push(todo);
            } else {
                groups[todo.workId].other.push(todo);
            }
        });
        return Object.values(groups);
    }), [filteredData, excludeFilters, excludeTopicFilters]);

    // 2. Filter & Sort
    const visibleAssignments = useMemo(() => allAssignments // Renamed from sortedAssignments to visibleAssignments for clarity inside hook
        .filter(a => {
            if (hideEmptyAssignments && a.pending.length === 0) return false;
            
            const isGraded = a.maxPoints && a.maxPoints > 0;
            if (assignmentFilter === 'graded' && !isGraded) return false;
            if (assignmentFilter === 'ungraded' && isGraded) return false;

            if (filterText && !a.title.toLowerCase().includes(filterText.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortType === 'name-asc') return a.title.localeCompare(b.title, 'sv');
            if (sortType === 'date-desc') return (b.latestUpdate || 0) - (a.latestUpdate || 0);
            if (sortType === 'date-asc') return (a.latestUpdate || 0) - (b.latestUpdate || 0);
            return 0;
        }), [allAssignments, hideEmptyAssignments, assignmentFilter, filterText, sortType]);

    // 2. Group by Topic
    const topicMap = new Map();
    // Collect all topics from the data
    const allTopics = new Map();
    
    // First, scan all items to find topic names directly on the objects if available
    visibleAssignments.forEach(item => {
        if (item.topicId && item.topicName) {
            allTopics.set(String(item.topicId), item.topicName);
        }
    });

    const groups = {};
    const noTopic = [];

    visibleAssignments.forEach(item => {
        const tid = item.topicId ? String(item.topicId) : null;
        if (tid) {
            if (!groups[tid]) groups[tid] = [];
            groups[tid].push(item);
        } else {
            noTopic.push(item);
        }
    });

    const topicGroups = Object.keys(groups).map(tid => {
        const assignments = groups[tid].sort((a, b) => {
            if (sortType === 'name-asc') return a.title.localeCompare(b.title, 'sv');
            if (sortType === 'date-desc') return (b.latestUpdate || 0) - (a.latestUpdate || 0);
            if (sortType === 'date-asc') return (a.latestUpdate || 0) - (b.latestUpdate || 0);
            return 0;
        });

        // Calculate latest activity for the entire topic group
        const groupLatestUpdate = Math.max(...assignments.map(a => a.latestUpdate || 0));

        return {
            id: tid,
            name: allTopics.get(tid) || groups[tid][0].topicName || 'Okänt Ämne',
            assignments: assignments,
            latestUpdate: groupLatestUpdate
        };
    });

    topicGroups.sort((a, b) => {
        if (sortType === 'date-desc') {
            // Sort topics by latest activity
            return (b.latestUpdate || 0) - (a.latestUpdate || 0);
        }
        if (sortType === 'date-asc') {
             return (a.latestUpdate || 0) - (b.latestUpdate || 0);
        }
        // Default: Alphabetical for name sort
        return a.name.localeCompare(b.name, 'sv', { numeric: true });
    });
    
    // Always put "Other" at the end if sorting by name, but respect date if sorting by date
    if (noTopic.length > 0) {
        // ... (Logic for 'Other' group - maybe treat it as a normal group now?)
        // Let's integrate 'Other' into the main sort logic for date sorting
        const otherAssignments = noTopic.sort((a, b) => {
             if (sortType === 'date-desc') return (b.latestUpdate || 0) - (a.latestUpdate || 0);
             return a.title.localeCompare(b.title, 'sv');
        });
        const otherLatest = Math.max(...otherAssignments.map(a => a.latestUpdate || 0));
        
        const otherGroup = { id: 'none', name: 'Övrigt', assignments: otherAssignments, latestUpdate: otherLatest };
        
        if (sortType.includes('date')) {
            topicGroups.push(otherGroup);
            topicGroups.sort((a, b) => sortType === 'date-desc' ? b.latestUpdate - a.latestUpdate : a.latestUpdate - b.latestUpdate);
        } else {
            topicGroups.push(otherGroup);
        }
    }

    return { sortedAssignments: visibleAssignments, topicGroups, visibleAssignments };
};
