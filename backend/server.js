const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(cookieSession({
    name: 'session',
    keys: ['secret_key_classroom_app'],
    maxAge: 24 * 60 * 60 * 1000
}));

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

app.get('/auth/google', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/classroom.courses.readonly',
        'https://www.googleapis.com/auth/classroom.rosters.readonly',
        'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
        'https://www.googleapis.com/auth/classroom.profile.emails',
        'https://www.googleapis.com/auth/classroom.topics.readonly'
    ];
    const url = oauth2Client.generateAuthUrl({ 
        access_type: 'offline', 
        scope: scopes,
        prompt: 'consent'
    });
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        req.session.tokens = tokens;
        res.redirect('http://localhost:5173');
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).send('Authentication failed');
    }
});

const checkAuth = (req, res, next) => {
    if (!req.session.tokens) return res.status(401).json({ error: 'Not authenticated' });
    oauth2Client.setCredentials(req.session.tokens);
    next();
};

app.get('/api/courses', checkAuth, async (req, res) => {
    try {
        const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
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
        const classroom = google.classroom({ version: 'v1', auth: oauth2Client });

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
