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
app.use('/api/students', studentRoutes);

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
        const dbPath = './classroom.db'; // Adjust if needed
        let sizeBytes = 0;
        // Check data dir
        const fullPath = path.join(__dirname, 'data', 'classroom.db');
        if (fs.existsSync(fullPath)) sizeBytes = fs.statSync(fullPath).size;

        const notesCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM notes WHERE user_id = ?', [userId], (err, row) => {
                if (err) reject(err); else resolve(row.count);
            });
        });
        
        const notesPerCourse = await new Promise((resolve, reject) => {
            db.all('SELECT course_id, COUNT(*) as count FROM notes WHERE user_id = ? GROUP BY course_id', [userId], (err, rows) => {
                if (err) reject(err); else resolve(rows);
            });
        });

        res.json({ dbSize: sizeBytes, totalNotes: notesCount, notesDistribution: notesPerCourse });
    } catch (err) {
        console.error("Stats error:", err);
        res.status(500).json({ error: 'Failed to fetch stats' });
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
