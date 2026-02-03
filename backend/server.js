const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');

dotenv.config();

const app = express();
const PORT = 3000;

// --- Encryption Setup ---
const ALGORITHM = 'aes-256-cbc';
const MASTER_KEY = process.env.MASTER_KEY;

if (!MASTER_KEY) {
    console.warn("WARNING: MASTER_KEY not set in .env! Notes will be saved unencrypted (insecure).");
    console.warn("To fix: Add MASTER_KEY=<random_string> to backend/.env");
}

const deriveUserKey = (userId) => {
    if (!MASTER_KEY) return null;
    // Derive a unique 32-byte key for the user using the master key and their ID
    return crypto.scryptSync(MASTER_KEY, userId, 32);
};

const encryptNote = (text, userId) => {
    const key = deriveUserKey(userId);
    if (!key) return text; // Fallback: save as plain text if no key

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decryptNote = (text, userId) => {
    const key = deriveUserKey(userId);
    if (!key) return text;

    // Check if text matches encrypted format (iv:content)
    const parts = text.split(':');
    if (parts.length !== 2) return text; // Assume plain text fallback

    try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.warn(`Decryption failed for note (User: ${userId}). Returning original.`);
        return text;
    }
};
// ------------------------

app.set('trust proxy', true);
app.use(express.json());

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

// --- Concurrency Helper ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runWithLimit = async (items, limit, fn) => {
    const results = [];
    const executing = [];
    for (const item of items) {
        // Add small delay to smooth out burst traffic
        await wait(50); 
        const p = Promise.resolve().then(() => fn(item));
        results.push(p);
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
};
// --------------------------

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
            'https://www.googleapis.com/auth/classroom.topics.readonly',
            'https://www.googleapis.com/auth/classroom.announcements.readonly',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/calendar.readonly'
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
        // Exchange code for tokens
        const { tokens } = await globalOauth2Client.getToken({
            code,
            redirect_uri: redirectUri
        });
        
        globalOauth2Client.setCredentials(tokens);

        // Fetch user profile to get unique ID
        const oauth2 = google.oauth2({ version: 'v2', auth: globalOauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        req.session.tokens = tokens;
        req.session.userId = userInfo.data.id; // Store Google User ID
        
        // Redirect back
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
        // Use global runWithLimit with concurrency 10
        const submissionsArrays = await runWithLimit(coursework, 10, async (cw) => {
             try {
                 const res = await classroom.courses.courseWork.studentSubmissions.list({
                    courseId,
                    courseWorkId: cw.id,
                    pageSize: 100 // assuming 1 submission per student per assignment usually fits
                });
                return res.data.studentSubmissions || [];
             } catch (err) {
                 console.error(`Failed to fetch submissions for cw ${cw.id}`, err.message);
                 return [];
             }
        });

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

app.get('/api/courses/:courseId/announcements', checkAuth, async (req, res) => {
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

app.get('/api/events', checkAuth, async (req, res) => {
    console.log('[DEBUG] Fetching GLOBAL events for ALL courses');
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        
        // 1. Fetch all active courses
        const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        let courses = coursesRes.data.courses || [];
        
        // Filter by requested courseIds if provided
        if (req.query.courseIds) {
            const requestedIds = new Set(req.query.courseIds.split(','));
            courses = courses.filter(c => requestedIds.has(c.id));
            console.log(`[DEBUG] Filtering events for ${courses.length} requested courses.`);
        }
        
        if (courses.length === 0) return res.json([]);

        // Pre-process courses to extract scoring keywords
        const courseMatchers = courses.map(c => {
            const name = c.name || '';
            const section = c.section || '';
            
            // Extract codes (e.g., PRRPRR01)
            const codeRegex = /[A-Z]{3,}[A-Z0-9]{2,}/g;
            const codes = (name + ' ' + section).match(codeRegex) || [];
            
            // Specific keywords (high value)
            const strongKeywords = [section].filter(s => s && s.length > 2).map(s => s.toLowerCase());

            // General keywords (medium value) - Codes
            const mediumKeywords = codes.map(c => c.toLowerCase());

            // Weak keywords (low value) - Name parts
            const parts = (name + ' ' + section)
                .replace(/[()]/g, ' ')
                .split(/[\s_-]+/)
                .filter(p => p.length > 3 && !codes.includes(p)); // Don't double count codes
            const weakKeywords = parts.map(p => p.toLowerCase());

            return {
                course: c,
                strong: strongKeywords,
                medium: mediumKeywords,
                weak: weakKeywords
            };
        });

        console.log(`[DEBUG] Prepared matchers for ${courses.length} courses.`);

        // 2. Fetch all calendar events
        const calendar = google.calendar({ version: 'v3', auth: globalOauth2Client });
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const eventsRes = await calendar.events.list({
            calendarId: 'primary',
            timeMin: threeMonthsAgo.toISOString(),
            maxResults: 1000, 
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const allEvents = eventsRes.data.items || [];
        console.log(`[DEBUG] Fetched ${allEvents.length} events from calendar.`);

        // 3. Score and Assign events
        const matchedEvents = allEvents.map(ev => {
            const text = ((ev.summary || '') + ' ' + (ev.description || '') + ' ' + (ev.location || '')).toLowerCase();
            
            // DEBUG: Trace specific events to understand matching
            const isDebugEvent = text.includes('ee22'); 
            if (isDebugEvent) console.log(`[DEBUG] Scoring event: "${ev.summary}"`);

            let bestMatch = null;
            let highestScore = 0;

            // First pass: Score all courses
            const scores = courseMatchers.map(matcher => {
                let score = 0;
                matcher.strong.forEach(kw => { if (text.includes(kw)) score += 50; }); // Massive boost for exact section match
                matcher.medium.forEach(kw => { if (text.includes(kw)) score += 10; });
                matcher.weak.forEach(kw => { if (text.includes(kw)) score += 1; });
                return { matcher, score };
            });

            // Second pass: Penalty for mismatching sections
            // If the text contains a STRONG keyword (Section) from Course A, 
            // then Course B (which doesn't have that keyword) should be disqualified or heavily penalized.
            const presentStrongKeywords = [];
            courseMatchers.forEach(m => {
                m.strong.forEach(kw => {
                    if (text.includes(kw)) presentStrongKeywords.push(kw);
                });
            });

            scores.forEach(item => {
                // If the text has a section keyword that DOESN'T belong to this course, kill the score.
                const hasAlienSection = presentStrongKeywords.some(k => !item.matcher.strong.includes(k));
                if (hasAlienSection) {
                    item.score = -100; 
                }
                
                if (isDebugEvent) console.log(`   -> Course: ${item.matcher.course.name} (${item.matcher.course.section}) = ${item.score}p`);

                if (item.score > 0 && item.score > highestScore) {
                    highestScore = item.score;
                    bestMatch = item.matcher.course;
                }
            });

            if (bestMatch) {
                if (isDebugEvent) console.log(`   => WINNER: ${bestMatch.name}`);
                return { ...ev, courseName: bestMatch.name };
            }
            return null;
        }).filter(Boolean);

        console.log(`[DEBUG] Returning ${matchedEvents.length} global events.`);
        res.json(matchedEvents);

    } catch (error) {
        console.error('Global event fetch error:', error);
        res.json([]);
    }
});

app.get('/api/courses/:courseId/events', checkAuth, async (req, res) => {
    const { courseId } = req.params;
    console.log(`[DEBUG] Fetching events from PRIMARY calendar for course context: ${courseId}`);
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        
        // Get Course info to use for filtering primary calendar events
        const courseRes = await classroom.courses.get({ id: courseId });
        const courseName = courseRes.data.name || '';
        const courseSection = courseRes.data.section || '';
        
        console.log(`[DEBUG] Course Info - Name: "${courseName}", Section (Avsnitt): "${courseSection}"`);

        // 1. Extract potential course codes (e.g., "PRRPRR01") 
        const codeRegex = /[A-Z]{3,}[A-Z0-9]{2,}/g; 
        const codes = (courseName + ' ' + courseSection).match(codeRegex) || [];

        // 2. Break down names into parts (e.g., "DigSkap (TE25A)" -> ["DigSkap", "TE25A"])
        const parts = (courseName + ' ' + courseSection)
            .replace(/[()]/g, ' ')
            .split(/[\s_-]+/)
            .filter(p => p.length > 3); // Only keep words longer than 3 chars

        // Combine all terms
        const searchTerms = [
            ...codes,
            ...parts,
            courseSection,
            courseName
        ].filter(t => t && t.length > 2); 
        
        const uniqueTerms = [...new Set(searchTerms)];

        console.log(`[DEBUG] Final search terms for '${courseName}':`, uniqueTerms);

        const calendar = google.calendar({ version: 'v3', auth: globalOauth2Client });
        
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const eventsRes = await calendar.events.list({
            calendarId: 'primary',
            timeMin: threeMonthsAgo.toISOString(),
            maxResults: 500, 
            singleEvents: true,
            orderBy: 'startTime',
        });
        
        const allEvents = eventsRes.data.items || [];
        console.log(`[DEBUG] Fetched ${allEvents.length} total events. Filtering...`);

        const matchedEvents = allEvents.filter(ev => {
            const summary = (ev.summary || '').toLowerCase();
            const description = (ev.description || '').toLowerCase();
            const location = (ev.location || '').toLowerCase();
            const fullText = summary + ' ' + description + ' ' + location;
            
            return uniqueTerms.some(term => fullText.includes(term.toLowerCase()));
        });

        console.log(`[DEBUG] Found ${matchedEvents.length} matches.`);
        res.json(matchedEvents);

    } catch (error) {
        console.error('Calendar fetch error:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        res.json([]);
    }
});

// --- Todo API ---

app.get('/api/courses/:courseId/todos', checkAuth, async (req, res) => {
    const { courseId } = req.params;
    console.log(`[DEBUG] Fetching todos for single course: ${courseId}`);
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });

        // A. Get Course (to ensure it exists and get name)
        const courseRes = await classroom.courses.get({ id: courseId }).catch(() => null);
        if (!courseRes) return res.status(404).json({ error: 'Course not found' });
        const course = courseRes.data;

        // Parallel fetch for details
        const [studentsRes, courseWorkRes, topicsRes] = await Promise.all([
            classroom.courses.students.list({ courseId }).catch(e => ({ data: { students: [] } })),
            classroom.courses.courseWork.list({ 
                courseId,
                orderBy: 'updateTime desc',
                pageSize: 100
            }).catch(e => ({ data: { courseWork: [] } })),
            classroom.courses.topics.list({ courseId }).catch(e => ({ data: { topic: [] } }))
        ]);

        const students = studentsRes.data.students || [];
        const courseWork = courseWorkRes.data.courseWork || [];
        const topics = topicsRes.data.topic || [];

        console.log(`[DEBUG] Found ${students.length} students, ${courseWork.length} coursework, ${topics.length} topics`);

        if (courseWork.length === 0) {
            console.log('[DEBUG] No coursework found, returning null');
            return res.json(null);
        }
        
        const topicMap = new Map(topics.map(t => [t.topicId, t.name]));
        const recentWork = courseWork.slice(0, 50);

        // Fetch submissions with global runWithLimit
        const submissionsArrays = await runWithLimit(recentWork, 10, async (cw) => {
            try {
                const r = await classroom.courses.courseWork.studentSubmissions.list({
                    courseId,
                    courseWorkId: cw.id,
                    pageSize: 100
                });
                return r.data.studentSubmissions || [];
            } catch (e) {
                console.warn(`Fetch submission failed for CW ${cw.id}: ${e.message}`);
                return [];
            }
        });
        
        const submissions = submissionsArrays.flat();
        console.log(`[DEBUG] Fetched ${submissions.length} raw submissions`);

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
                                    };        }).filter(Boolean);

        console.log(`[DEBUG] Returning ${todoItems.length} processed todo items`);

        // Log status for all students (Generic)
        if (todoItems.length > 0) {
            console.log(`\n[LOG] --- Assignment Status Report for ${course.name} ---`);
            todoItems.forEach(item => {
                console.log(`Task: ${item.workTitle.substring(0, 20).padEnd(20)} | Student: ${item.studentName.padEnd(20)} | State: ${item.state} | Grade: ${item.assignedGrade || '-'}`);
            });
            console.log('-------------------------------------------------------\n');
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

app.get('/api/todos', checkAuth, async (req, res) => {
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        
        // 1. Get all active courses
        const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        let allCourses = coursesRes.data.courses || [];
        
        // Filter by requested courseIds if provided
        if (req.query.courseIds) {
            const requestedIds = new Set(req.query.courseIds.split(','));
            allCourses = allCourses.filter(c => requestedIds.has(c.id));
            console.log(`[DEBUG] Filtering todos for ${allCourses.length} requested courses.`);
        }
        
        if (allCourses.length === 0) return res.json([]);

        // 2. Fetch data for each course in parallel
        // Use runWithLimit for courses (max 3 concurrent courses)
        const results = await runWithLimit(allCourses, 3, async (course) => {
            try {
                // Parallelize sub-requests for this course
                const [studentsRes, courseWorkRes, topicsRes] = await Promise.all([
                    // A. Get Students (to map IDs to names)
                    classroom.courses.students.list({ courseId: course.id }).catch(e => ({ data: { students: [] } })),
                    // B. Get CourseWork (to get titles)
                    classroom.courses.courseWork.list({ 
                        courseId: course.id,
                        orderBy: 'updateTime desc',
                        pageSize: 100 // Fetch more to be sure, we slice later
                    }).catch(e => ({ data: { courseWork: [] } })),
                    // C. Get Topics
                    classroom.courses.topics.list({ courseId: course.id }).catch(e => ({ data: { topic: [] } }))
                ]);

                const students = studentsRes.data.students || [];
                const courseWork = courseWorkRes.data.courseWork || [];
                const topics = topicsRes.data.topic || [];

                if (courseWork.length === 0) return null;
                
                const topicMap = new Map(topics.map(t => [t.topicId, t.name]));

                // D. Fetch submissions for all coursework.
                // Increased back to 50 since IndexedDB handles the large payload easily
                const recentWork = courseWork.slice(0, 50);

                // Fetch submissions with global runWithLimit (max 10 concurrent requests per course)
                const submissionsArrays = await runWithLimit(recentWork, 10, async (cw) => {
                    try {
                        const r = await classroom.courses.courseWork.studentSubmissions.list({
                            courseId: course.id,
                            courseWorkId: cw.id,
                            pageSize: 100
                        });
                        return r.data.studentSubmissions || [];
                    } catch (e) {
                        // Log warnings but don't fail entire fetch
                        console.warn(`Fetch submission failed for CW ${cw.id}: ${e.message}`);
                        return [];
                    }
                });
                
                const submissions = submissionsArrays.flat();

                if (submissions.length === 0) return null;

                // Map data for frontend
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
                                            };                }).filter(Boolean);

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

        const filteredResults = results.filter(Boolean); // Remove nulls (courses with no pending work)
        
        res.json(filteredResults);

    } catch (error) {
        console.error('Global todo fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch todos' });
    }
});

// --- Notes API ---

app.get('/api/notes/:courseId', checkAuth, (req, res) => {
    const userId = req.session.userId;
    const { courseId } = req.params;
    
    if (!userId) return res.status(401).json({ error: 'User ID missing in session' });

    db.all(
        'SELECT post_id, content FROM notes WHERE user_id = ? AND course_id = ?',
        [userId, courseId],
        (err, rows) => {
            if (err) {
                console.error('DB fetch error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            // Transform array to object: { "postId1": "content1", ... }
            const notesMap = {};
            rows.forEach(row => {
                notesMap[row.post_id] = decryptNote(row.content, userId);
            });
            res.json(notesMap);
        }
    );
});

app.post('/api/notes', checkAuth, (req, res) => {
    const userId = req.session.userId;
    const { courseId, postId, content } = req.body;

    if (!userId) return res.status(401).json({ error: 'User ID missing' });
    if (!courseId || !postId) return res.status(400).json({ error: 'Missing fields' });

    const encryptedContent = encryptNote(content, userId);

    // Upsert (Insert or Replace)
    const sql = `
        INSERT INTO notes (user_id, course_id, post_id, content) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, post_id) 
        DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP
    `;
    
    db.run(sql, [userId, courseId, postId, encryptedContent], function(err) {
        if (err) {
            console.error('DB save error:', err);
            return res.status(500).json({ error: 'Failed to save note' });
        }
        res.json({ success: true });
    });
});

// --- Settings API ---

app.get('/api/settings', checkAuth, (req, res) => {
    const userId = req.session.userId;
    db.get('SELECT data FROM settings WHERE user_id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Settings fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(row ? JSON.parse(row.data) : {});
    });
});

app.get('/api/stats', checkAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const dbPath = './classroom.db'; // Default sqlite path
        
        // 1. File Size
        let sizeBytes = 0;
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            sizeBytes = stats.size;
        }

        // 2. Row Counts
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

app.post('/api/settings', checkAuth, (req, res) => {
    const userId = req.session.userId;
    const settingsData = JSON.stringify(req.body);

    const sql = `
        INSERT INTO settings (user_id, data) 
        VALUES (?, ?)
        ON CONFLICT(user_id) 
        DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
    `;
    
    db.run(sql, [userId, settingsData], function(err) {
        if (err) {
            console.error('Settings save error:', err);
            return res.status(500).json({ error: 'Failed to save settings' });
        }
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
    console.log("--- SERVER RESTARTED WITH NEW SCORING ALGO ---");
});