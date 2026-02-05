const express = require('express');
const router = express.Router();
const db = require('../database');
const { globalOauth2Client } = require('../services/google');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

/**
 * Get aggregated Todos for ALL courses.
 * Now reads directly from the local relational DB!
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // Base SQL to find all pending submissions
        let sql = `
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
            WHERE c.is_active = 1
        `;

        const params = [];

        // Optional: Filter by specific courses if requested
        if (req.query.courseIds) {
            const idList = req.query.courseIds.split(',').map(id => id.trim());
            const placeholders = idList.map(() => '?').join(',');
            sql += ` AND c.id IN (${placeholders})`;
            params.push(...idList);
        }

        sql += ` ORDER BY ss.update_time DESC`;

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error("Fetch todos DB error:", err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Group the flat rows by course to maintain frontend compatibility
            const grouped = {};
            rows.forEach(row => {
                if (!grouped[row.courseId]) {
                    grouped[row.courseId] = {
                        courseId: row.courseId,
                        courseName: row.courseName,
                        courseSection: row.courseSection,
                        todos: []
                    };
                }
                
                // Add the submission link (constructed or stored)
                // Note: alternate_link for submissions is often workLink + some suffix,
                // for now we use the work link.
                row.submissionLink = row.workLink; 
                
                grouped[row.courseId].todos.push(row);
            });

            res.json(Object.values(grouped));
        });

    } catch (error) {
        console.error('Global todo fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

module.exports = router;