const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'classroom.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    db.run('DELETE FROM student_classes', (err) => {
        if (err) {
            console.error('Failed to clear table:', err);
        } else {
            console.log('Successfully cleared student_classes table.');
        }
    });
});

db.close();
