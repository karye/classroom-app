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

/**
 * Initializes the database schema.
 * All tables are linked via Foreign Keys for data integrity.
 */
function initDb() {
    return new Promise((resolve) => {
        db.serialize(() => {
            // Enable Foreign Keys
            db.run("PRAGMA foreign_keys = ON");

            // 1. COURSES - Master list of all Google Classrooms
            db.run(`CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                section TEXT,
                alternate_link TEXT,
                last_synced DATETIME,
                is_active INTEGER DEFAULT 1
            )`);

            // 2. STUDENTS - Master list of all unique students
            db.run(`CREATE TABLE IF NOT EXISTS students (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT,
                photo_url TEXT,
                class_name TEXT,
                group_name TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 3. COURSE_STUDENTS - Link table between Courses and Students (Many-to-Many)
            db.run(`CREATE TABLE IF NOT EXISTS course_students (
                course_id TEXT,
                student_id TEXT,
                PRIMARY KEY (course_id, student_id),
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
            )`);

            // 4. TOPICS - Subjects/Areas within a course
            db.run(`CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                course_id TEXT,
                name TEXT NOT NULL,
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
            )`);

            // 4b. GRADE_CATEGORIES - Classroom grading categories
            db.run(`CREATE TABLE IF NOT EXISTS grade_categories (
                id TEXT PRIMARY KEY,
                course_id TEXT,
                name TEXT NOT NULL,
                weight INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
            )`);

            // 5. COURSEWORK - Assignments, Materials and Announcements
            db.run(`CREATE TABLE IF NOT EXISTS coursework (
                id TEXT PRIMARY KEY,
                course_id TEXT,
                topic_id TEXT,
                grade_category_id TEXT,
                title TEXT NOT NULL,
                type TEXT DEFAULT 'ASSIGNMENT',
                max_points INTEGER,
                due_date DATETIME,
                alternate_link TEXT,
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
                FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE SET NULL,
                FOREIGN KEY (grade_category_id) REFERENCES grade_categories (id) ON DELETE SET NULL
            )`);

            // 6. STUDENT_SUBMISSIONS - Results and Status for every student/assignment
            db.run(`CREATE TABLE IF NOT EXISTS student_submissions (
                id TEXT PRIMARY KEY,
                coursework_id TEXT,
                student_id TEXT,
                state TEXT,
                assigned_grade REAL,
                late INTEGER DEFAULT 0,
                update_time DATETIME,
                FOREIGN KEY (coursework_id) REFERENCES coursework (id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
            )`);

            // 7. CALENDAR_EVENTS - Scheduled lessons
            db.run(`CREATE TABLE IF NOT EXISTS calendar_events (
                id TEXT PRIMARY KEY,
                course_id TEXT,
                summary TEXT NOT NULL,
                description TEXT,
                location TEXT,
                start_time DATETIME,
                end_time DATETIME,
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL
            )`);

            // 7b. ANNOUNCEMENTS - Classroom Stream Posts
            db.run(`CREATE TABLE IF NOT EXISTS announcements (
                id TEXT PRIMARY KEY,
                course_id TEXT,
                text TEXT,
                update_time DATETIME,
                alternate_link TEXT,
                materials TEXT,
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
            )`);

            // 8. NOTES - User's private encrypted logbook
            db.run(`CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                post_id TEXT NOT NULL,
                course_id TEXT,
                content TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, post_id)
            )`);

            // 9. GROUP_MAPPINGS - Bridge between imported names and Google Courses
            db.run(`CREATE TABLE IF NOT EXISTS group_mappings (
                group_name TEXT PRIMARY KEY,
                course_id TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE
            )`);

            // 10. SETTINGS - Global user configuration
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                user_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            console.log("Database schema initialized successfully.");
            
            // Ensure columns exist (Migrations)
            db.run("ALTER TABLE students ADD COLUMN group_name TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("Migration error (group_name):", err.message);
                }
            });

            db.run("ALTER TABLE coursework ADD COLUMN grade_category_id TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("Migration error (grade_category_id):", err.message);
                }
            });

            // MIGRATION: Move data from old student_classes if it exists
            migrateLegacyData();
            resolve();
        });
    });
}

/**
 * Migration helper to move data from the old flat student_classes table
 * to the new relational students table.
 */
function migrateLegacyData() {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='student_classes'", (err, row) => {
        if (row) {
            console.log("Migration: Found legacy student_classes table. Moving data...");
            db.run(`INSERT OR IGNORE INTO students (id, full_name, class_name) 
                    SELECT google_id, student_name, class_name FROM student_classes 
                    WHERE google_id NOT LIKE 'TEMP_%'`);
            
            // Note: We keep TEMP_ students in student_classes for now as they are part of the import flow
            console.log("Migration: Legacy data moved to students table.");
        }
    });
}

db.reinitSchema = initDb;
module.exports = db;