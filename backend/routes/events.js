const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const db = require('../database');
const { globalOauth2Client } = require('../services/google');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

/**
 * 1. Get GLOBAL events (Smart Matching & DB Mirroring)
 */
router.get('/', async (req, res) => {
    const shouldRefresh = req.query.refresh === 'true';
    const { courseIds } = req.query; // Expecting comma-separated string
    
    try {
        if (shouldRefresh) {
            console.log('[SYNC] Refreshing calendar events from Google...');
            const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
            
            // A. Fetch active courses to build matchers
            const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
            const googleCourses = coursesRes.data.courses || [];
            
            const courseMatchers = googleCourses.map(c => {
                const name = c.name || '';
                const section = c.section || '';
                const codeRegex = /[A-Z]{3,}[A-Z0-9]{2,}/g;
                const codes = (name + ' ' + section).match(codeRegex) || [];
                
                return {
                    id: c.id,
                    name: c.name,
                    strong: [section].filter(s => s && s.length > 2).map(s => s.toLowerCase()),
                    medium: codes.map(c => c.toLowerCase()),
                    weak: (name + ' ' + section).replace(/[()]/g, ' ').split(/[\s_-]+/).filter(p => p.length > 3 && !codes.includes(p)).map(p => p.toLowerCase())
                };
            });

            // B. Fetch Google Calendar
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
            
            const googleEvents = eventsRes.data.items || [];

            // C. Match and Mirror to DB
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    
                    // Clear old matched events
                    db.run("DELETE FROM calendar_events");

                    const stmt = db.prepare(`
                        INSERT INTO calendar_events (id, course_id, summary, description, location, start_time, end_time) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `);

                    googleEvents.forEach(ev => {
                        const text = ((ev.summary || '') + ' ' + (ev.description || '') + ' ' + (ev.location || '')).toLowerCase();
                        
                        let bestMatchId = null;
                        let highestScore = 0;

                        const presentStrongKeywords = [];
                        courseMatchers.forEach(m => m.strong.forEach(kw => { if (text.includes(kw)) presentStrongKeywords.push(kw); }));

                        courseMatchers.forEach(matcher => {
                            let score = 0;
                            matcher.strong.forEach(kw => { if (text.includes(kw)) score += 50; });
                            matcher.medium.forEach(kw => { if (text.includes(kw)) score += 10; });
                            matcher.weak.forEach(kw => { if (text.includes(kw)) score += 1; });

                            const hasAlienSection = presentStrongKeywords.some(k => !matcher.strong.includes(k));
                            if (hasAlienSection) score = -100; 

                            if (score > 0 && score > highestScore) {
                                highestScore = score;
                                bestMatchId = matcher.id;
                            }
                        });

                        if (bestMatchId) {
                            const start = ev.start.dateTime || ev.start.date;
                            const end = ev.end.dateTime || ev.end.date;
                            stmt.run(ev.id, bestMatchId, ev.summary, ev.description || '', ev.location || '', start, end);
                        }
                    });

                    stmt.finalize();
                    db.run("COMMIT", (err) => err ? reject(err) : resolve());
                });
            });
        }

        // D. Return from DB (Filtered by courseIds if provided)
        let sql = `
            SELECT 
                ce.*, 
                c.name as courseName,
                (SELECT COUNT(*) FROM announcements a 
                 WHERE a.course_id = ce.course_id 
                 AND strftime('%Y-%m-%d', COALESCE(a.scheduled_time, a.update_time)) = strftime('%Y-%m-%d', ce.start_time)) as announcementCount,
                (SELECT COUNT(*) FROM notes n
                 JOIN announcements a ON n.post_id = a.id
                 WHERE a.course_id = ce.course_id
                 AND strftime('%Y-%m-%d', COALESCE(a.scheduled_time, a.update_time)) = strftime('%Y-%m-%d', ce.start_time)) as noteCount
            FROM calendar_events ce
            JOIN courses c ON ce.course_id = c.id
        `;
        const params = [];

        if (courseIds) {
            const idList = courseIds.split(',');
            const placeholders = idList.map(() => '?').join(',');
            sql += ` WHERE ce.course_id IN (${placeholders}) `;
            params.push(...idList);
        }

        sql += ` ORDER BY ce.start_time ASC`;

        db.all(sql, params, (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            // Format for frontend (mimic Google API structure)
            const formatted = rows.map(r => ({
                id: r.id,
                courseId: r.course_id,
                summary: r.summary,
                description: r.description,
                location: r.location,
                courseName: r.courseName,
                announcementCount: r.announcementCount,
                noteCount: r.noteCount,
                start: { dateTime: r.start_time },
                end: { dateTime: r.end_time }
            }));
            res.json(formatted);
        });

    } catch (error) {
        console.error('Global event fetch error:', error);
        res.status(500).json({ error: 'Failed to sync calendar' });
    }
});

module.exports = router;