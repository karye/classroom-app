const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const { globalOauth2Client } = require('../services/google');

// Helper to get dynamic redirect URI based on request headers
// Useful when running behind proxies (ngrok, docker, etc)
const getRedirectUri = (req) => {
    if (process.env.REDIRECT_URI) return process.env.REDIRECT_URI;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    console.log('DEBUG: proto=', proto, 'host=', host);
    return `${proto}://${host}/auth/google/callback`;
};

// 1. Redirect user to Google Login
router.get('/google', (req, res) => {
    const redirectUri = getRedirectUri(req);
    console.log('--- /auth/google called ---');
    
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
        
        const url = globalOauth2Client.generateAuthUrl({ 
            access_type: 'offline', 
            scope: scopes,
            prompt: 'consent',
            redirect_uri: redirectUri
        });
        
        res.redirect(url);
    } catch (error) {
        console.error('Error in /auth/google:', error);
        res.status(500).send('Failed to generate auth URL');
    }
});

// 2. Callback from Google
router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req);

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
        
        // Redirect back to app root
        const proto = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        res.redirect(`${proto}://${host}`);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).send('Authentication failed');
    }
});

module.exports = router;
