const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const db = require('../database');
const { globalOauth2Client, runWithLimit } = require('../services/google');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

// 1. Import Students (Raw Text)
router.post('/import', async (req, res) => {
    const { text } = req.body;
    const isDryRun = req.query.dryRun === 'true';
    
    if (!text) return res.status(400).json({ error: 'No text provided' });

    console.log(`[DEBUG] Processing student import (DryRun: ${isDryRun})...`);

    try {
        const lines = text.split('\n');
        let currentGroup = 'Osorterade';
        let hasValidHeader = false;
        
        const matches = [];
        const failures = [];

        // Header Validation
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.toLowerCase().includes('grupplista')) {
                currentGroup = trimmed.replace(/grupplista/i, '').trim();
            }
            const parts = trimmed.toLowerCase().split(/[\t\s]+/);
            if (parts.includes('nr') && parts.includes('klass') && parts.includes('namn')) {
                hasValidHeader = true;
            }
        }

        if (!hasValidHeader) return res.json({ isValid: false, error: 'Rubriken saknar nödvändiga kolumner (Nr, Klass, Namn).' });

        // Parse Lines
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.toLowerCase().includes('grupplista')) continue;

            const parts = trimmed.split(/[\t\s]+/);
            if (parts.some(p => p.toLowerCase() === 'nr')) continue;

            const firstColIsNumber = /^\d+$/.test(parts[0]);
            if (!firstColIsNumber) continue;

            if (parts.length < 3 || !parts[1] || !parts[2]) {
                return res.json({ isValid: false, error: `Raden "${trimmed}" saknar data.` });
            }

            const className = parts[1]; 
            const nameRaw = parts.slice(2).join(' ').trim(); 
            
            if (className.length < 2 || nameRaw.length < 2) {
                return res.json({ isValid: false, error: `Ogiltig data på rad: ${trimmed}` });
            }

            const nameNorm = nameRaw.replace(/[^a-z0-9]/gi, '');
            const groupNorm = currentGroup.replace(/[^a-z0-9]/gi, '');
            const tempId = `TEMP_${groupNorm}_${nameNorm}`;

            matches.push({ name: nameRaw, class: className, googleId: tempId, isTemp: true });

            if (!isDryRun) {
                await new Promise((resolve) => {
                    db.run(
                        'INSERT OR REPLACE INTO student_classes (google_id, class_name, group_name, student_name) VALUES (?, ?, ?, ?)',
                        [tempId, className, currentGroup, nameRaw],
                        (err) => {
                            if (err) console.error(`[ERROR] Insert failed:`, err.message);
                            resolve();
                        }
                    );
                });
            }
        }

        res.json({ isValid: true, matches, failures, groupName: currentGroup });

    } catch (err) {
        console.error("Import failed:", err);
        res.status(500).json({ error: 'Import failed: ' + err.message });
    }
});

// 2. List all saved students
router.get('/classes', (req, res) => {
    db.all('SELECT * FROM student_classes ORDER BY class_name, student_name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// 3. Delete single student mapping
router.delete('/classes/:googleId', (req, res) => {
    const { googleId } = req.params;
    db.run('DELETE FROM student_classes WHERE google_id = ?', [googleId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// 4. Delete entire group
router.delete('/groups/:groupName', (req, res) => {
    const { groupName } = req.params;
    let sql = 'DELETE FROM student_classes WHERE group_name = ?';
    if (groupName === 'Osorterade') sql += ' OR group_name IS NULL OR group_name = ""';
    
    db.run(sql, [groupName], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// 5. Get Group Mappings
router.get('/groups/mappings', (req, res) => {
    db.all('SELECT * FROM group_mappings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// 6. Save Group Mapping
router.post('/groups/mappings', (req, res) => {
    const { groupName, courseId } = req.body;
    db.run(`INSERT OR REPLACE INTO group_mappings (group_name, course_id) VALUES (?, ?)`, [groupName, courseId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// 7. Sync & Match (The Magic Button)
router.post('/groups/sync', async (req, res) => {
    const { groupName, courseId } = req.body;
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        const sRes = await classroom.courses.students.list({ courseId, pageSize: 100 });
        const googleStudents = sRes.data.students || [];
        
        if (googleStudents.length === 0) return res.json({ matched: 0, total: 0, message: "Inga elever hittades i Classroom." });

        const googleMap = new Map();
        googleStudents.forEach(s => {
            if (s.profile && s.profile.name) {
                const norm = s.profile.name.fullName.toLowerCase().replace(/[^a-zåäö]/g, '').split('').sort().join('');
                googleMap.set(norm, { id: s.userId, name: s.profile.name.fullName });
            }
        });

        db.all('SELECT * FROM student_classes WHERE group_name = ?', [groupName], (err, dbRows) => {
            if (err) return res.status(500).json({ error: 'DB Read Error' });

            let matchedCount = 0;
            const updates = [];

            dbRows.forEach(row => {
                const dbNameNorm = (row.student_name || '').toLowerCase().replace(/[^a-zåäö]/g, '').split('').sort().join('');
                const match = googleMap.get(dbNameNorm);
                
                if (match && row.google_id !== match.id) {
                    updates.push({ newId: match.id, oldId: row.google_id, newName: match.name });
                    matchedCount++;
                }
            });

            if (updates.length > 0) {
                const stmt = db.prepare('UPDATE student_classes SET google_id = ?, student_name = ? WHERE google_id = ?');
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    updates.forEach(u => stmt.run(u.newId, u.newName, u.oldId));
                    stmt.finalize();
                    db.run("COMMIT");
                });
            }

            res.json({ matched: matchedCount, updated: updates.length, total: dbRows.length, message: `Matchade ${matchedCount} av ${dbRows.length} elever.` });
        });

    } catch (error) {
        console.error("Sync failed:", error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

module.exports = router;
