const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

// Global OAuth2 Client
// Used for all Google API calls. Credentials are set per-request via middleware.
const globalOauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
    // Redirect URI is dynamic in our app, so we don't set it here globally
);

// --- Concurrency Helper ---
// Prevents hitting Google API rate limits ("Quota Exceeded")
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runWithLimit = async (items, limit, fn) => {
    const results = [];
    const executing = [];
    for (const item of items) {
        // Add delay to prevent hitting Google's rate limits
        await wait(100); 
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

module.exports = {
    globalOauth2Client,
    runWithLimit
};
