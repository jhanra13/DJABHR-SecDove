import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { getEnv } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultPath = join(__dirname, '..', 'database', 'securedove.db');
let configuredPath = getEnv('DB_PATH', defaultPath);

// In Vercel serverless, use writable /tmp when no explicit DB_PATH is provided
const isVercel = !!process.env.VERCEL;
if (isVercel && (!process.env.DB_PATH || process.env.DB_PATH === defaultPath)) {
  configuredPath = '/tmp/securedove.db';
}

function ensureDirExists(path) {
  try {
    const dir = dirname(path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // ignore
  }
}

function createMinimalSchema(database) {
  const statements = [
    'PRAGMA foreign_keys = ON',
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      public_key TEXT NOT NULL,
      salt TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      contact_user_id INTEGER NOT NULL,
      contact_username TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, contact_user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER NOT NULL,
      content_key_number INTEGER NOT NULL,
      username TEXT NOT NULL,
      encrypted_content_key TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (id, content_key_number, username),
      FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_username ON conversations(username)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_id ON conversations(id)`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      content_key_number INTEGER NOT NULL,
      encrypted_msg_content TEXT NOT NULL,
      sender_username TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      is_deleted INTEGER DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, content_key_number)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
    `CREATE TABLE IF NOT EXISTS conversation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      actor_username TEXT,
      details TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_events_conversation ON conversation_events(conversation_id, created_at)`
  ];

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      const runNext = (index = 0) => {
        if (index >= statements.length) {
          resolve();
          return;
        }

        database.run(statements[index], (err) => {
          if (err) {
            reject(err);
            return;
          }
          runNext(index + 1);
        });
      };

      runNext();
    });
  });
}

function normalizeExistingUsernames(database) {
  const cleanupStatements = [
    `UPDATE users SET username = LOWER(TRIM(username))`,
    `UPDATE contacts SET contact_username = LOWER(TRIM(contact_username))`,
    `UPDATE conversations SET username = LOWER(TRIM(username))`,
    `UPDATE messages SET sender_username = LOWER(TRIM(sender_username)) WHERE sender_username IS NOT NULL`,
    `UPDATE conversation_events SET actor_username = LOWER(TRIM(actor_username)) WHERE actor_username IS NOT NULL`
  ];

  return new Promise((resolve) => {
    database.serialize(() => {
      const runNext = (index = 0) => {
        if (index >= cleanupStatements.length) {
          resolve();
          return;
        }

        database.run(cleanupStatements[index], () => runNext(index + 1));
      };

      runNext();
    });
  });
}

function openDatabase(path) {
  return new Promise((resolve, reject) => {
    try {
      ensureDirExists(path);
      const database = new sqlite3.Database(path, async (err) => {
        if (err) return reject(err);
        console.log(`Connected to SQLite database at ${path}`);
        await createMinimalSchema(database);
        await normalizeExistingUsernames(database);
        resolve(database);
      });
    } catch (e) {
      reject(e);
    }
  });
}

let db;
try {
  db = await openDatabase(configuredPath);
} catch (err) {
  console.error('Primary database open failed:', err?.message || err);
  if (isVercel) {
    try {
      // Last-resort: in-memory DB to keep the function alive (data will not persist)
      db = await openDatabase(':memory:');
      console.warn('Using in-memory SQLite database (serverless fallback)');
    } catch (e) {
      console.error('Fallback in-memory database open failed:', e?.message || e);
      throw e;
    }
  } else {
    throw err;
  }
}

// Helper function to run queries with promises
export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Helper function to get single row
export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Helper function to get all rows
export const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export default db;
