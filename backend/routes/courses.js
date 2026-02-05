const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const db = require('../database');
const { globalOauth2Client } = require('../services/google');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

/**
 * 1. List all courses (Offline-first)
 */
router.get('/', async (req, res) => {
    const shouldRefresh = req.query.refresh === 'true';
    try {
        if (shouldRefresh) {
            const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
            const response = await classroom.courses.list({ courseStates: ['ACTIVE'] });
            const googleCourses = response.data.courses || [];

            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    const stmt = db.prepare(`INSERT INTO courses (id, name, section, alternate_link) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, section=excluded.section, alternate_link=excluded.alternate_link`);
                    googleCourses.forEach(c => stmt.run(c.id, c.name, c.section || '', c.alternateLink));
                    stmt.finalize((err) => err ? reject(err) : resolve());
                });
            });
        }
        db.all('SELECT * FROM courses WHERE is_active = 1 ORDER BY name ASC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

// Helper to handle pagination
const fetchAllPages = async (resource, method, params) => {
    let items = [];
    let nextPageToken = null;
    do {
        const res = await resource[method]({ ...params, pageToken: nextPageToken });
        const key = Object.keys(res.data).find(k => Array.isArray(res.data[k]));
        if (key && res.data[key]) items = items.concat(res.data[key]);
        nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);
    return items;
};

/**
 * 2. Get Course Details (Matrix View Data)
 */
router.get('/:courseId/details', async (req, res) => {
    const { courseId } = req.params;
    const shouldRefresh = req.query.refresh === 'true';

    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });

        if (shouldRefresh) {
            // A. Fetch everything using pagination helper
            const [googleStudents, googleWork, googleTopics, googleAnnouncements] = await Promise.all([
                fetchAllPages(classroom.courses.students, 'list', { courseId, pageSize: 100 }),
                fetchAllPages(classroom.courses.courseWork, 'list', { courseId, pageSize: 100 }),
                fetchAllPages(classroom.courses.topics, 'list', { courseId, pageSize: 100 }).catch(() => []),
                fetchAllPages(classroom.courses.announcements, 'list', { courseId, pageSize: 100 }).catch(() => [])
            ]);

            // B. Fetch Submissions (Heavy payload, ensure we get all)
            const googleSubmissions = await fetchAllPages(classroom.courses.courseWork.studentSubmissions, 'list', {
                courseId,
                courseWorkId: '-', 
                pageSize: 100 // Keep page size reasonable to avoid timeouts per request
            });

            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");

                    // 1. Topics
                    db.run("DELETE FROM topics WHERE course_id = ?", [courseId]);
                    const tStmt = db.prepare("INSERT INTO topics (id, course_id, name) VALUES (?, ?, ?)");
                    googleTopics.forEach(t => tStmt.run(t.topicId, courseId, t.name));
                    tStmt.finalize();

                    // 2. Students & Links
                    const sStmt = db.prepare(`INSERT INTO students (id, full_name, email, photo_url) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, email=excluded.email, photo_url=excluded.photo_url`);
                    googleStudents.forEach(s => sStmt.run(s.userId, s.profile.name.fullName, s.profile.emailAddress, s.profile.photoUrl));
                    sStmt.finalize();

                    db.run("DELETE FROM course_students WHERE course_id = ?", [courseId]);
                    const csStmt = db.prepare("INSERT INTO course_students (course_id, student_id) VALUES (?, ?)");
                    googleStudents.forEach(s => csStmt.run(courseId, s.userId));
                    csStmt.finalize();

                    // 3. CourseWork
                    db.run("DELETE FROM coursework WHERE course_id = ?", [courseId]);
                    const cwStmt = db.prepare(`INSERT INTO coursework (id, course_id, topic_id, title, type, max_points, due_date, alternate_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                    googleWork.forEach(cw => {
                        const dueDate = cw.dueDate ? `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2,'0')}-${String(cw.dueDate.day).padStart(2,'0')}` : null;
                        cwStmt.run(cw.id, courseId, cw.topicId || null, cw.title, cw.workType || 'ASSIGNMENT', cw.maxPoints ?? null, dueDate, cw.alternateLink);
                    });
                    cwStmt.finalize();

                    // 4. Submissions
                    db.run("DELETE FROM student_submissions WHERE coursework_id IN (SELECT id FROM coursework WHERE course_id = ?)", [courseId]);
                    const subStmt = db.prepare(`INSERT INTO student_submissions (id, coursework_id, student_id, state, assigned_grade, late, update_time) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    googleSubmissions.forEach(sub => {
                        subStmt.run(sub.id, sub.courseWorkId, sub.userId, sub.state, sub.assignedGrade ?? null, sub.late ? 1 : 0, sub.updateTime);
                    });
                    subStmt.finalize();

                    // 5. Announcements (Stream)
                    db.run("DELETE FROM announcements WHERE course_id = ?", [courseId]);
                    const annStmt = db.prepare(`INSERT INTO announcements (id, course_id, text, update_time, alternate_link, materials) VALUES (?, ?, ?, ?, ?, ?)`);
                    googleAnnouncements.forEach(ann => {
                        annStmt.run(ann.id, courseId, ann.text || '', ann.updateTime, ann.alternateLink, JSON.stringify(ann.materials || []));
                    });
                    annStmt.finalize();

                    db.run("UPDATE courses SET last_synced = CURRENT_TIMESTAMP WHERE id = ?", [courseId]);
                    db.run("COMMIT", (err) => err ? reject(err) : resolve());
                });
            });
        }

        // Return Data (Full context for all views)
        const result = { students: [], coursework: [], submissions: [], topics: [], announcements: [], courseSection: '', courseName: '' };
        
        const p1 = new Promise(res => db.get("SELECT name, section FROM courses WHERE id = ?", [courseId], (err, row) => { 
            if(row) {
                result.courseName = row.name;
                result.courseSection = row.section;
            }
            res(); 
        }));
        const p2 = new Promise(res => db.all("SELECT id as topicId, name FROM topics WHERE course_id = ?", [courseId], (err, rows) => { result.topics = rows || []; res(); }));
        const p3 = new Promise(res => db.all("SELECT s.id as userId, s.full_name, s.email, s.photo_url, s.class_name as studentClass FROM students s JOIN course_students cs ON s.id = cs.student_id WHERE cs.course_id = ?", [courseId], (err, rows) => {
            result.students = (rows || []).map(r => ({ userId: r.userId, studentClass: r.studentClass, profile: { name: { fullName: r.full_name }, emailAddress: r.email, photoUrl: r.photo_url }}));
            res();
        }));
        const p4 = new Promise(res => db.all("SELECT id, topic_id as topicId, title, type, max_points as maxPoints, due_date as dueDate, alternate_link as alternateLink FROM coursework WHERE course_id = ?", [courseId], (err, rows) => { result.coursework = rows || []; res(); }));
        const p5 = new Promise(res => db.all("SELECT ss.id, ss.coursework_id as courseWorkId, ss.student_id as userId, ss.state, ss.assigned_grade as assignedGrade, ss.late, ss.update_time as updateTime FROM student_submissions ss JOIN coursework cw ON ss.coursework_id = cw.id WHERE cw.course_id = ?", [courseId], (err, rows) => { result.submissions = rows || []; res(); }));
        const p6 = new Promise(res => db.all("SELECT * FROM announcements WHERE course_id = ? ORDER BY update_time DESC", [courseId], (err, rows) => {
            result.announcements = (rows || []).map(r => ({
                id: r.id,
                text: r.text,
                updateTime: r.update_time,
                alternateLink: r.alternate_link,
                materials: JSON.parse(r.materials || '[]')
            }));
            res();
        }));

        await Promise.all([p1, p2, p3, p4, p5, p6]);
        res.json(result);

    } catch (error) {
        console.error('Details sync error:', error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

/**
 * 3. Get Course Announcements (Stream View)
 */
router.get('/:courseId/announcements', async (req, res) => {
    const { courseId } = req.params;
    db.all("SELECT * FROM announcements WHERE course_id = ? ORDER BY update_time DESC", [courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Parse materials back to JSON
        const formatted = rows.map(r => ({
            id: r.id,
            text: r.text,
            updateTime: r.update_time,
            alternateLink: r.alternate_link,
            materials: JSON.parse(r.materials || '[]')
        }));
        res.json(formatted);
    });
});

/**
 * 4. Get Course Todos (Single Course Todo View)
 */
router.get('/:courseId/todos', async (req, res) => {
    const { courseId } = req.params;
    try {
        const sql = `
            SELECT 
                ss.id,
                ss.coursework_id as workId,
                ss.student_id as studentId,
                ss.state,
                ss.late,
                ss.assigned_grade as assignedGrade,
                ss.update_time as updateTime,
                cw.title as workTitle,
                cw.alternate_link as workLink,
                cw.max_points as maxPoints,
                cw.course_id as courseId,
                cw.topic_id as topicId,
                c.name as courseName,
                c.section as courseSection,
                s.full_name as studentName,
                s.photo_url as studentPhoto,
                s.class_name as studentClass,
                t.name as topicName
            FROM student_submissions ss
            JOIN coursework cw ON ss.coursework_id = cw.id
            JOIN courses c ON cw.course_id = c.id
            JOIN students s ON ss.student_id = s.id
            LEFT JOIN topics t ON cw.topic_id = t.id
            WHERE cw.course_id = ?
            ORDER BY ss.update_time DESC
        `;

        db.all(sql, [courseId], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (rows.length === 0) {
                return res.json({ courseId, courseName: '', todos: [] });
            }

            const result = {
                courseId: rows[0].courseId,
                courseName: rows[0].courseName,
                courseSection: rows[0].courseSection,
                todos: rows.map(r => ({ ...r, submissionLink: r.workLink }))
            };
            res.json(result);
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch course todos' });
    }
});

module.exports = router;
