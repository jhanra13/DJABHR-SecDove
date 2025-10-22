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
  return new Promise((resolve) => {
    database.serialize(() => {
      database.run('PRAGMA foreign_keys = ON');
      // Users table (required for /api/auth/*)
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          public_key TEXT NOT NULL,
          salt TEXT NOT NULL,
          encrypted_private_key TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
      database.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
      resolve();
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
