const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const { globalOauth2Client } = require('../services/google');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

// 1. Get GLOBAL events (Smart Matching)
router.get('/', async (req, res) => {
    console.log('[DEBUG] Fetching GLOBAL events');
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        
        const coursesRes = await classroom.courses.list({ courseStates: ['ACTIVE'] });
        let courses = coursesRes.data.courses || [];
        
        if (req.query.courseIds) {
            const requestedIds = new Set(req.query.courseIds.split(','));
            courses = courses.filter(c => requestedIds.has(c.id));
        }
        
        if (courses.length === 0) return res.json([]);

        // Pre-process matchers
        const courseMatchers = courses.map(c => {
            const name = c.name || '';
            const section = c.section || '';
            const codeRegex = /[A-Z]{3,}[A-Z0-9]{2,}/g;
            const codes = (name + ' ' + section).match(codeRegex) || [];
            
            return {
                course: c,
                strong: [section].filter(s => s && s.length > 2).map(s => s.toLowerCase()),
                medium: codes.map(c => c.toLowerCase()),
                weak: (name + ' ' + section).replace(/[()]/g, ' ').split(/[\s_-]+/).filter(p => p.length > 3 && !codes.includes(p)).map(p => p.toLowerCase())
            };
        });

        // Fetch Calendar
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

        // Score and Match
        const matchedEvents = allEvents.map(ev => {
            const text = ((ev.summary || '') + ' ' + (ev.description || '') + ' ' + (ev.location || '')).toLowerCase();
            
            let bestMatch = null;
            let highestScore = 0;

            const scores = courseMatchers.map(matcher => {
                let score = 0;
                matcher.strong.forEach(kw => { if (text.includes(kw)) score += 50; });
                matcher.medium.forEach(kw => { if (text.includes(kw)) score += 10; });
                matcher.weak.forEach(kw => { if (text.includes(kw)) score += 1; });
                return { matcher, score };
            });

            // Penalty logic
            const presentStrongKeywords = [];
            courseMatchers.forEach(m => m.strong.forEach(kw => { if (text.includes(kw)) presentStrongKeywords.push(kw); }));

            scores.forEach(item => {
                const hasAlienSection = presentStrongKeywords.some(k => !item.matcher.strong.includes(k));
                if (hasAlienSection) item.score = -100; 
                
                if (item.score > 0 && item.score > highestScore) {
                    highestScore = item.score;
                    bestMatch = item.matcher.course;
                }
            });

            if (bestMatch) return { ...ev, courseName: bestMatch.name };
            return null;
        }).filter(Boolean);

        res.json(matchedEvents);

    } catch (error) {
        console.error('Global event fetch error:', error);
        res.json([]);
    }
});

module.exports = router;
