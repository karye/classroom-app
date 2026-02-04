const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const { globalOauth2Client, runWithLimit } = require('../services/google');
const { injectStudentClasses } = require('../utils/helpers');
const { checkAuth } = require('../utils/auth');

// Apply auth check to all routes in this file
router.use(checkAuth(globalOauth2Client));

// 1. List all active courses
router.get('/', async (req, res) => {
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        const response = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        const allCourses = response.data.courses || [];

        // Filter: Only return courses that actually have students (avoids clutter)
        const coursesWithStudents = await Promise.all(allCourses.map(async (course) => {
            try {
                const studentsRes = await classroom.courses.students.list({
                    courseId: course.id,
                    pageSize: 1
                });
                const hasStudents = studentsRes.data.students && studentsRes.data.students.length > 0;
                return hasStudents ? course : null;
            } catch (err) {
                return null; 
            }
        }));

        const filteredCourses = coursesWithStudents.filter(c => c !== null);
        res.json(filteredCourses);
    } catch (error) {
        console.error('Fetch courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// 2. Get Course Details (Matrix View Data)
router.get('/:courseId/details', async (req, res) => {
    const { courseId } = req.params;
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });

        const [studentsRes, courseWorkRes, topicsRes, courseRes] = await Promise.all([
            classroom.courses.students.list({ courseId, pageSize: 100 }),
            classroom.courses.courseWork.list({ courseId, pageSize: 100, orderBy: 'updateTime desc' }),
            classroom.courses.topics.list({ courseId, pageSize: 100 }).catch(() => ({ data: { topic: [] } })),
            classroom.courses.get({ id: courseId })
        ]);
        
        const students = studentsRes.data.students || [];
        const coursework = courseWorkRes.data.courseWork || [];
        const topics = topicsRes.data.topic || [];
        const courseSection = courseRes.data.section || '';

        // Fetch submissions concurrently
        const submissionsArrays = await runWithLimit(coursework, 10, async (cw) => {
             try {
                 const res = await classroom.courses.courseWork.studentSubmissions.list({
                    courseId,
                    courseWorkId: cw.id,
                    pageSize: 100
                });
                return res.data.studentSubmissions || [];
             } catch (err) {
                 return [];
             }
        });

        const submissions = submissionsArrays.flat();

        await injectStudentClasses(students, req.session.userId);

        res.json({ students, coursework, submissions, topics, courseSection });

    } catch (error) {
        console.error('Details fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch course details' });
    }
});

// 3. Get Announcements (Stream View)
router.get('/:courseId/announcements', async (req, res) => {
    const { courseId } = req.params;
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        const response = await classroom.courses.announcements.list({
            courseId,
            pageSize: 100,
            orderBy: 'updateTime desc'
        });
        res.json(response.data.announcements || []);
    } catch (error) {
        console.error('Fetch announcements error:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// 4. Get Todos for a specific course
router.get('/:courseId/todos', async (req, res) => {
    const { courseId } = req.params;
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });

        const courseRes = await classroom.courses.get({ id: courseId }).catch(() => null);
        if (!courseRes) return res.status(404).json({ error: 'Course not found' });
        const course = courseRes.data;

        const [studentsRes, courseWorkRes, topicsRes] = await Promise.all([
            classroom.courses.students.list({ courseId }).catch(() => ({ data: { students: [] } })),
            classroom.courses.courseWork.list({ courseId, orderBy: 'updateTime desc', pageSize: 100 }).catch(() => ({ data: { courseWork: [] } })),
            classroom.courses.topics.list({ courseId }).catch(() => ({ data: { topic: [] } }))
        ]);

        const students = studentsRes.data.students || [];
        const courseWork = courseWorkRes.data.courseWork || [];
        const topics = topicsRes.data.topic || [];

        if (courseWork.length === 0) return res.json(null);
        
        const topicMap = new Map(topics.map(t => [t.topicId, t.name]));
        const recentWork = courseWork.slice(0, 50);

        const submissionsArrays = await runWithLimit(recentWork, 10, async (cw) => {
            try {
                const r = await classroom.courses.courseWork.studentSubmissions.list({
                    courseId,
                    courseWorkId: cw.id,
                    pageSize: 100
                });
                return r.data.studentSubmissions || [];
            } catch (e) { return []; }
        });
        
        const submissions = submissionsArrays.flat();
        if (submissions.length === 0) return res.json(null);

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

        res.json({
            courseId: course.id,
            courseName: course.name,
            studentCount: students.length,
            todos: todoItems
        });

    } catch (error) {
        console.error(`Single course todo fetch error for ${courseId}:`, error);
        res.status(500).json({ error: 'Failed to fetch course todos' });
    }
});

module.exports = router;
