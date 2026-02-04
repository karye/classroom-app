const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const { globalOauth2Client, runWithLimit } = require('../services/google');
const { injectStudentClasses } = require('../utils/helpers');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

// Get aggregated Todos for ALL courses
router.get('/', async (req, res) => {
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        
        const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        let allCourses = coursesRes.data.courses || [];
        
        // Optimisation: Filter by requested IDs
        if (req.query.courseIds) {
            const requestedIds = new Set(req.query.courseIds.split(','));
            allCourses = allCourses.filter(c => requestedIds.has(c.id));
        }
        
        if (allCourses.length === 0) return res.json([]);

        // Concurrent Fetch
        const results = await runWithLimit(allCourses, 3, async (course) => {
            try {
                const [studentsRes, courseWorkRes, topicsRes] = await Promise.all([
                    classroom.courses.students.list({ courseId: course.id }).catch(() => ({ data: { students: [] } })),
                    classroom.courses.courseWork.list({ courseId, orderBy: 'updateTime desc', pageSize: 100 }).catch(() => ({ data: { courseWork: [] } })),
                    classroom.courses.topics.list({ courseId }).catch(() => ({ data: { topic: [] } }))
                ]);

                const students = studentsRes.data.students || [];
                const courseWork = courseWorkRes.data.courseWork || [];
                const topics = topicsRes.data.topic || [];

                if (courseWork.length === 0) return null;
                
                const topicMap = new Map(topics.map(t => [t.topicId, t.name]));
                const recentWork = courseWork.slice(0, 50);

                const submissionsArrays = await runWithLimit(recentWork, 10, async (cw) => {
                    try {
                        const r = await classroom.courses.courseWork.studentSubmissions.list({
                            courseId: course.id,
                            courseWorkId: cw.id,
                            pageSize: 100
                        });
                        return r.data.studentSubmissions || [];
                    } catch (e) { return []; }
                });
                
                const submissions = submissionsArrays.flat();
                if (submissions.length === 0) return null;

                const studentMap = new Map(students.map(s => [s.userId, s.profile]));
                const workMap = new Map(courseWork.map(cw => [cw.id, cw]));

                const todoItems = submissions.map(sub => {
                    const student = studentMap.get(sub.userId);
                    const work = workMap.get(sub.courseWorkId);
                    if (!student || !work) return null;

                    return {
                        id: sub.id,
                        courseId: course.id,
                        courseName: course.name,
                        courseSection: course.section || '',
                        workId: sub.courseWorkId,
                        workTitle: work.title,
                        workLink: work.alternateLink,
                        topicId: work.topicId,
                        topicName: topicMap.get(work.topicId) || 'Övrigt',
                        studentId: sub.userId,
                        studentName: student.name.fullName,
                        studentPhoto: student.photoUrl,
                        submissionLink: sub.alternateLink,
                        updateTime: sub.updateTime,
                        late: sub.late,
                        state: sub.state,
                        assignedGrade: sub.assignedGrade,
                        maxPoints: work.maxPoints
                    };
                }).filter(Boolean);

                if (todoItems.length > 0) {
                    await injectStudentClasses(todoItems, req.session.userId);
                }

                if (todoItems.length === 0) return null;

                return {
                    courseId: course.id,
                    courseName: course.name,
                    studentCount: students.length,
                    todos: todoItems
                };

            } catch (err) {
                console.error(`Todo fetch failed for course ${course.id}:`, err.message);
                return null;
            }
        });

        res.json(results.filter(Boolean));

    } catch (error) {
        console.error('Global todo fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

module.exports = router;
