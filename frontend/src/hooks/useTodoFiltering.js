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
                    assignments: [] // For API consistency if needed
                };
                // Make assignments point to self so we can access courseSection if needed in details
                groups[todo.workId].assignments.push(todo);
            }
            
            if (todo.state === 'TURNED_IN') {
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
    const sortedAssignments = useMemo(() => allAssignments
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

    // 3. Group by Topic
    const { topicGroups, visibleAssignments } = useMemo(() => {
        const groups = [];
        const topicsMap = {};

        sortedAssignments.forEach(assign => {
            const tKey = `${assign.courseId}-${assign.topicId}`;
            if (!topicsMap[tKey]) {
                topicsMap[tKey] = {
                    id: tKey,
                    name: assign.topicName,
                    courseName: assign.courseName,
                    assignments: []
                };
                groups.push(topicsMap[tKey]);
            }
            topicsMap[tKey].assignments.push(assign);
        });

        const flatList = groups.flatMap(t => t.assignments);
        return { topicGroups: groups, visibleAssignments: flatList };
    }, [sortedAssignments]);

    return { sortedAssignments, topicGroups, visibleAssignments };
};
