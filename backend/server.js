const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = 3000;
app.set('trust proxy', true);

// --- Logging Setup ---
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch (e) {
        console.error('Could not create log directory:', e);
    }
}
const LOG_FILE = path.join(LOG_DIR, 'server.log');

const logToFile = (level, args) => {
    try {
        const timestamp = new Date().toISOString();
        const message = args.map(a => 
            (a instanceof Error) ? a.stack : 
            (typeof a === 'object') ? JSON.stringify(a) : a
        ).join(' ');
        const logLine = `[${timestamp}] [${level}] ${message}\n`;
        fs.appendFileSync(LOG_FILE, logLine); // Sync to ensure write
    } catch (err) {
        // Fallback if file write fails, don't loop indefinitely
        process.stdout.write('Failed to write to log file: ' + err.message + '\n');
    }
};

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
    originalLog(...args);
    logToFile('INFO', args);
};

console.error = (...args) => {
    originalError(...args);
    logToFile('ERROR', args);
};
// ---------------------

// We will allow all origins or infer from request, as we are behind a proxy that serves same-origin.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Simplified CORS: allow all or reflect. Since frontend is same-origin via proxy, this is mostly for dev.
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(cookieSession({
    name: 'session',
    keys: ['secret_key_classroom_app'],
    maxAge: 24 * 60 * 60 * 1000
}));

// Global client for calls that don't need specific redirect URI (like API calls using stored tokens)
// But for Auth flow, we will create/configure instances dynamically.
const globalOauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    // Redirect URI is not strictly needed here if we only use it for API calls with setCredentials
);

// Helper to get dynamic redirect URI
const getRedirectUri = (req) => {
    if (process.env.REDIRECT_URI) return process.env.REDIRECT_URI;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    console.log('DEBUG: proto=', proto, 'host=', host, 'headers=', JSON.stringify(req.headers));
    return `${proto}://${host}/auth/google/callback`;
};

app.get('/auth/google', (req, res) => {
    const redirectUri = getRedirectUri(req);
    console.log('--- /auth/google called ---');
    console.log('Dynamic Redirect URI:', redirectUri);

    try {
        const scopes = [
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
            'https://www.googleapis.com/auth/classroom.profile.emails',
            'https://www.googleapis.com/auth/classroom.topics.readonly'
        ];
        
        // Generate auth URL using the dynamic redirect URI
        const url = globalOauth2Client.generateAuthUrl({ 
            access_type: 'offline', 
            scope: scopes,
            prompt: 'consent',
            redirect_uri: redirectUri
        });
        
        console.log('Generated Redirect URL:', url);
        res.redirect(url);
    } catch (error) {
        console.error('Error in /auth/google:', error);
        res.status(500).send('Failed to generate auth URL');
    }
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req);
    console.log('Callback Redirect URI:', redirectUri);

    try {
        // Exchange code for tokens, specifying the SAME redirect_uri used in auth
        const { tokens } = await globalOauth2Client.getToken({
            code,
            redirect_uri: redirectUri
        });
        
        req.session.tokens = tokens;
        
        // Redirect back to the root of the app (same host)
        const proto = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        res.redirect(`${proto}://${host}`);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).send('Authentication failed');
    }
});

const checkAuth = (req, res, next) => {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    globalOauth2Client.setCredentials(req.session.tokens);
    next();
};

app.get('/api/courses', checkAuth, async (req, res) => {
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        const response = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        const allCourses = response.data.courses || [];

        // Filter courses: keep only those with at least one student
        const coursesWithStudents = await Promise.all(allCourses.map(async (course) => {
            try {
                const studentsRes = await classroom.courses.students.list({
                    courseId: course.id,
                    pageSize: 1
                });
                const hasStudents = studentsRes.data.students && studentsRes.data.students.length > 0;
                return hasStudents ? course : null;
            } catch (err) {
                console.error(`Check students failed for course ${course.id}:`, err.message);
                return null; // Exclude courses where check fails (e.g. permission issues)
            }
        }));

        const filteredCourses = coursesWithStudents.filter(c => c !== null);
        res.json(filteredCourses);
    } catch (error) {
        console.error('Fetch courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.get('/api/courses/:courseId/details', checkAuth, async (req, res) => {
    const { courseId } = req.params;
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });

        // 1. Fetch Students
        const studentsPromise = classroom.courses.students.list({
            courseId,
            pageSize: 100
        });

        // 2. Fetch CourseWork
        const courseWorkPromise = classroom.courses.courseWork.list({
            courseId,
            pageSize: 100,
            orderBy: 'updateTime desc'
        });

        // 3. Fetch Topics
        const topicsPromise = classroom.courses.topics.list({
            courseId,
            pageSize: 100
        }).catch(err => {
            console.error('Topics fetch failed (ignoring):', err.message);
            return { data: { topic: [] } };
        });

        const [studentsRes, courseWorkRes, topicsRes] = await Promise.all([studentsPromise, courseWorkPromise, topicsPromise]);
        
        console.log('--- Debug Course Details ---');
        console.log('Students Status:', studentsRes.status);
        console.log('Students Data Keys:', Object.keys(studentsRes.data));
        console.log('Student Count:', studentsRes.data.students ? studentsRes.data.students.length : 0);
        console.log('CourseWork Count:', courseWorkRes.data.courseWork ? courseWorkRes.data.courseWork.length : 0);
        
        const students = studentsRes.data.students || [];
        const coursework = courseWorkRes.data.courseWork || [];
        const topics = topicsRes.data.topic || [];

        // 4. Fetch Submissions for each CourseWork
        // We limit this to the fetched coursework (max 100). 
        // Note: This spawns multiple requests.
        const submissionsPromises = coursework.map(cw => 
            classroom.courses.courseWork.studentSubmissions.list({
                courseId,
                courseWorkId: cw.id,
                pageSize: 100 // assuming 1 submission per student per assignment usually fits
            }).then(res => res.data.studentSubmissions || [])
              .catch(err => {
                  console.error(`Failed to fetch submissions for cw ${cw.id}`, err.message);
                  return [];
              })
        );

        const submissionsArrays = await Promise.all(submissionsPromises);
        const submissions = submissionsArrays.flat();

        res.json({
            students,
            coursework,
            submissions,
            topics
        });

    } catch (error) {
        console.error('Details fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch course details' });
    }
});

app.get('/api/user', (req, res) => {
    res.json({ loggedIn: !!req.session.tokens });
});

app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ message: 'Logged out' });
});

app.listen(PORT, () => console.log(`Backend: http://localhost:${PORT}`));