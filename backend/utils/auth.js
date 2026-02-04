const { google } = require('googleapis');

// Middleware to check if user is authenticated via Google
// Sets credentials on the global client if token exists in session
const checkAuth = (globalOauth2Client) => (req, res, next) => {
    if (!req.session.tokens) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    // Set credentials for this request context
    globalOauth2Client.setCredentials(req.session.tokens);
    next();
};

module.exports = { checkAuth };
