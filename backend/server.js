const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');
const fs = require('fs');
const path = require('path');
const db = require('./database');

// Routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const todoRoutes = require('./routes/todos');
const eventRoutes = require('./routes/events');
const studentRoutes = require('./routes/students');
const { encryptNote, decryptNote } = require('./utils/helpers');
const { checkAuth } = require('./utils/auth');
const { globalOauth2Client } = require('./services/google');

dotenv.config();

const app = express();
const PORT = 3000;

app.set('trust proxy', true);
app.use(express.json());

// Logging
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// CORS & Session
app.use(cors({ origin: true, credentials: true }));
app.use(cookieSession({
    name: 'session',
    keys: ['secret_key_classroom_app'],
    maxAge: 24 * 60 * 60 * 1000
}));

// --- MOUNT ROUTES ---
app.use('/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/events', eventRoutes);

// Students & Groups
app.use('/api/students', studentRoutes); // Supports /api/students/classes, /api/students/import
app.use('/api/groups', studentRoutes);   // Supports /api/groups/mappings, /api/groups/sync

// --- Settings & Notes (Still here for simplicity, or move to routes/user.js) ---

// Settings
app.get('/api/settings', checkAuth(globalOauth2Client), (req, res) => {
    const userId = req.session.userId;
    db.get('SELECT data FROM settings WHERE user_id = ?', [userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(row ? JSON.parse(row.data) : {});
    });
});

app.post('/api/settings', checkAuth(globalOauth2Client), (req, res) => {
    const userId = req.session.userId;
    const settingsData = JSON.stringify(req.body);
    const sql = `INSERT INTO settings (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`;
    db.run(sql, [userId, settingsData], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save settings' });
        res.json({ success: true });
    });
});

// Stats
app.get('/api/stats', checkAuth(globalOauth2Client), async (req, res) => {
    try {
        const userId = req.session.userId;
        const dbPath = path.join(__dirname, 'data', 'classroom.db');
        let sizeBytes = 0;
        
        if (fs.existsSync(dbPath)) {
            sizeBytes = fs.statSync(dbPath).size;
        }

        // Get total notes count
        const notesCount = await new Promise((resolve) => {
            db.get('SELECT COUNT(*) as count FROM notes WHERE user_id = ?', [userId], (err, row) => {
                resolve(row ? row.count : 0);
            });
        });
        
        // Get distribution per course
        const notesPerCourse = await new Promise((resolve) => {
            db.all('SELECT course_id, COUNT(*) as count FROM notes WHERE user_id = ? GROUP BY course_id', [userId], (err, rows) => {
                resolve(rows || []);
            });
        });

        res.json({ 
            dbSize: sizeBytes, 
            totalNotes: notesCount, 
            notesDistribution: notesPerCourse 
        });
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.post('/api/stats/reset', checkAuth(globalOauth2Client), async (req, res) => {
    const userId = req.session.userId;
    console.log(`[SYSTEM] User ${userId} requested full database reset with course restoration.`);

    try {
        // 1. Clear the database
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                db.run("DELETE FROM coursework");
                db.run("DELETE FROM student_submissions");
                db.run("DELETE FROM topics");
                db.run("DELETE FROM course_students");
                db.run("DELETE FROM calendar_events");
                db.run("DELETE FROM courses");
                db.run("DELETE FROM students"); 
                db.run("COMMIT", (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        // 2. Shrink file
        db.run("VACUUM");

        // 3. Restore the course list from Google immediately
        const { google } = require('googleapis');
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        const response = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        const googleCourses = response.data.courses || [];

        if (googleCourses.length > 0) {
            const stmt = db.prepare(`INSERT INTO courses (id, name, section, alternate_link) VALUES (?, ?, ?, ?)`);
            await new Promise((resolve) => {
                db.serialize(() => {
                    googleCourses.forEach(c => stmt.run(c.id, c.name, c.section || '', c.alternateLink));
                    stmt.finalize();
                    resolve();
                });
            });
            console.log(`[SYSTEM] Restored ${googleCourses.length} courses after reset.`);
        }

        res.json({ success: true, message: 'Systemet har nollställts och kurslistan har återställts.' });

    } catch (err) {
        console.error("Reset error:", err);
        res.status(500).json({ error: 'Reset failed' });
    }
});

// Notes
app.get('/api/notes/:courseId', checkAuth(globalOauth2Client), (req, res) => {
    const userId = req.session.userId;
    db.all('SELECT post_id, content FROM notes WHERE user_id = ? AND course_id = ?', [userId, req.params.courseId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const notesMap = {};
        rows.forEach(row => { notesMap[row.post_id] = decryptNote(row.content, userId); });
        res.json(notesMap);
    });
});

app.post('/api/notes', checkAuth(globalOauth2Client), (req, res) => {
    const userId = req.session.userId;
    const { courseId, postId, content } = req.body;
    const encryptedContent = encryptNote(content, userId);
    const sql = `INSERT INTO notes (user_id, course_id, post_id, content) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, post_id) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP`;
    db.run(sql, [userId, courseId, postId, encryptedContent], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save note' });
        res.json({ success: true });
    });
});

app.get('/api/user', (req, res) => {
    res.json({ loggedIn: !!req.session.tokens });
});

app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ message: 'Logged out' });
});

app.listen(PORT, () => {
    console.log(`Backend: http://localhost:${PORT}`);
    console.log("--- SERVER RESTARTED (Modular Architecture) ---");
});
