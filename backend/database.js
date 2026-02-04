const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'classroom.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
        initDb();
    }
});

function initDb() {
    const sql = `
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            post_id TEXT NOT NULL,
            content TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, post_id)
        )
    `;
    db.run(sql, (err) => {
        if (err) console.error('Error creating table', err);
    });

    const settingsSql = `
        CREATE TABLE IF NOT EXISTS settings (
            user_id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.run(settingsSql, (err) => {
        if (err) console.error('Error creating settings table', err);
    });

    const classesSql = `
        CREATE TABLE IF NOT EXISTS student_classes (
            google_id TEXT PRIMARY KEY,
            class_name TEXT NOT NULL,
            group_name TEXT,
            student_name TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.run(classesSql, (err) => {
        if (err) console.error('Error creating student_classes table', err);
        else {
            // Migration: Add group_name if it doesn't exist (for existing databases)
            db.run("ALTER TABLE student_classes ADD COLUMN group_name TEXT", (err) => {
                if (err) {
                    if (err.message.includes("duplicate column name")) {
                        // Already exists, ignore
                    } else {
                        console.error("Migration error (group_name):", err.message);
                    }
                } else {
                    console.log("Migration: Added group_name column to student_classes");
                }
            });
        }
    });

    const mappingSql = `
        CREATE TABLE IF NOT EXISTS group_mappings (
            group_name TEXT PRIMARY KEY,
            course_id TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.run(mappingSql, (err) => {
        if (err) console.error('Error creating group_mappings table', err);
    });
}

module.exports = db;
