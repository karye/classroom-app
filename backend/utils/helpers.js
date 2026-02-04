const crypto = require('crypto');
const db = require('../database');

// --- Encryption ---
const ALGORITHM = 'aes-256-cbc';
const MASTER_KEY = process.env.MASTER_KEY;

const deriveUserKey = (userId) => {
    if (!MASTER_KEY) return null;
    return crypto.scryptSync(MASTER_KEY, userId, 32);
};

const encryptNote = (text, userId) => {
    const key = deriveUserKey(userId);
    if (!key) return text; 

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decryptNote = (text, userId) => {
    const key = deriveUserKey(userId);
    if (!key) return text;

    const parts = text.split(':');
    if (parts.length !== 2) return text;

    try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return text;
    }
};

// --- Database Helpers ---

// Inject 'studentClass' into a list of students/submissions
const injectStudentClasses = async (dataArray, userId) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT google_id, class_name FROM student_classes', [], (err, rows) => {
            if (err) {
                console.error("Failed to load student classes", err);
                resolve(dataArray);
                return;
            }
            const classMap = new Map(rows.map(r => [r.google_id, r.class_name]));
            
            dataArray.forEach(item => {
                const uid = item.userId || item.studentId; 
                if (uid && classMap.has(uid)) {
                    item.studentClass = classMap.get(uid);
                }
            });
            resolve(dataArray);
        });
    });
};

module.exports = {
    encryptNote,
    decryptNote,
    injectStudentClasses
};
