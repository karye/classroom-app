const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const db = require('../database');
const { globalOauth2Client } = require('../services/google');
const { checkAuth } = require('../utils/auth');

router.use(checkAuth(globalOauth2Client));

/**
 * 1. Import Students (Raw Text from SchoolSoft)
 * Matches: POST /api/students/import
 */
router.post('/import', async (req, res) => {
    const { text } = req.body;
    const isDryRun = req.query.dryRun === 'true';
    
    if (!text) return res.status(400).json({ error: 'No text provided' });

    console.log(`[DEBUG] Processing student import (DryRun: ${isDryRun})...
`);

    try {
        const lines = text.split('\n');
        let currentGroup = 'Osorterade';
        let hasValidHeader = false;
        
        const matches = [];

        // 1. Header & Group Validation
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

        // 2. Parse Lines
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.toLowerCase().includes('grupplista')) continue;

            const parts = trimmed.split(/[\t\s]+/);
            if (parts.some(p => p.toLowerCase() === 'nr')) continue; // Skip header row

            const firstColIsNumber = /^\d+$/.test(parts[0]);
            if (!firstColIsNumber) continue;

            if (parts.length < 3 || !parts[1] || !parts[2]) continue;

            const className = parts[1]; 
            const nameRaw = parts.slice(2).join(' ').trim(); 
            
            if (className.length < 2 || nameRaw.length < 2) continue;

            const nameNorm = nameRaw.replace(/[^a-z0-9]/gi, '');
            const groupNorm = currentGroup.replace(/[^a-z0-9]/gi, '');
            const tempId = `TEMP_${groupNorm}_${nameNorm}`;

            matches.push({ 
                id: tempId, 
                full_name: nameRaw, 
                class_name: className, 
                group_name: currentGroup 
            });

            if (!isDryRun) {
                await new Promise((resolve) => {
                    db.run(
                        `INSERT INTO students (id, full_name, class_name, group_name) VALUES (?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET full_name=excluded.full_name, class_name=excluded.class_name, group_name=excluded.group_name`,
                        [tempId, nameRaw, className, currentGroup],
                        (err) => {
                            if (err) console.error(`[ERROR] Insert failed:`, err.message);
                            resolve();
                        }
                    );
                });
            }
        }

        res.json({ isValid: true, matches, groupName: currentGroup });

    } catch (err) {
        console.error("Import failed:", err);
        res.status(500).json({ error: 'Import failed: ' + err.message });
    }
});

/**
 * 2. Classes (List & Delete)
 * Matches: GET /api/students/classes, DELETE /api/students/classes/:id
 */
router.get('/classes', (req, res) => {
    db.all('SELECT id, full_name, class_name, group_name FROM students WHERE class_name IS NOT NULL ORDER BY class_name, full_name', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Map to legacy format for frontend
        res.json(rows.map(r => ({
            google_id: r.id,
            student_name: r.full_name,
            class_name: r.class_name,
            group_name: r.group_name
        })));
    });
});

router.delete('/classes/:id', (req, res) => {
    const { id } = req.params;
    db.run('UPDATE students SET class_name = NULL, group_name = NULL WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

/**
 * 3. Mappings (Dropdown connection between Group and Course)
 * Matches: GET /api/groups/mappings, POST /api/groups/mappings
 */
router.get('/mappings', (req, res) => {
    db.all('SELECT * FROM group_mappings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

router.post('/mappings', (req, res) => {
    const { groupName, courseId } = req.body;
    db.run(`INSERT OR REPLACE INTO group_mappings (group_name, course_id) VALUES (?, ?)`, [groupName, courseId], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

/**
 * 4. Sync (Match imported names with Google IDs)
 * Matches: POST /api/groups/sync
 */
router.post('/sync', async (req, res) => {
    const { groupName, courseId } = req.body;
    try {
        const classroom = google.classroom({ version: 'v1', auth: globalOauth2Client });
        const sRes = await classroom.courses.students.list({ courseId, pageSize: 100 });
        const googleStudents = sRes.data.students || [];
        
        const googleMap = new Map();
        googleStudents.forEach(s => {
            if (s.profile && s.profile.name) {
                // Fuzzy normalization: lowercase, strip special, sort chars
                const norm = s.profile.name.fullName.toLowerCase().replace(/[^a-zåäö]/g, '').split('').sort().join('');
                googleMap.set(norm, { id: s.userId, name: s.profile.name.fullName, email: s.profile.emailAddress, photo: s.profile.photoUrl });
            }
        });

        db.all('SELECT * FROM students WHERE group_name = ?', [groupName], (err, dbRows) => {
            if (err) return res.status(500).json({ error: 'DB Read Error' });

            const updates = [];
            dbRows.forEach(row => {
                const dbNameNorm = (row.full_name || '').toLowerCase().replace(/[^a-zåäö]/g, '').split('').sort().join('');
                const match = googleMap.get(dbNameNorm);
                
                if (match && row.id !== match.id) {
                    updates.push({ oldId: row.id, newId: match.id, name: match.name, email: match.email, photo: match.photo, class: row.class_name, group: row.group_name });
                }
            });

            if (updates.length > 0) {
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    updates.forEach(u => {
                        // 1. Insert/Update real student
                        db.run(`INSERT OR REPLACE INTO students (id, full_name, email, photo_url, class_name, group_name) VALUES (?, ?, ?, ?, ?, ?)`,
                               [u.newId, u.name, u.email, u.photo, u.class, u.group]);
                        // 2. Delete the TEMP record
                        db.run(`DELETE FROM students WHERE id = ?`, [u.oldId]);
                        // 3. Update any course links
                        db.run(`UPDATE course_students SET student_id = ? WHERE student_id = ?`, [u.newId, u.oldId]);
                    });
                    db.run("COMMIT");
                });
            }

            res.json({ matched: updates.length, total: dbRows.length, message: `Matchade ${updates.length} elever.` });
        });

    } catch (error) {
        console.error("Sync failed:", error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

/**
 * 5. Delete Entire Group
 * Matches: DELETE /api/groups/:groupName
 */
router.delete('/:groupName', (req, res) => {
    const { groupName } = req.params;
    let sql = 'UPDATE students SET class_name = NULL, group_name = NULL WHERE group_name = ?';
    if (groupName === 'Osorterade') sql += ' OR group_name IS NULL OR group_name = ""';
    
    db.run(sql, [groupName], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

module.exports = router;