import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../data/secdove.db');

async function clearDatabase() {
  try {
    if (existsSync(DB_PATH)) {
      await unlink(DB_PATH);
      console.log('✅ Database file deleted successfully');
      console.log('📁 Path:', DB_PATH);
      console.log('\n💡 The database will be recreated when you start the server next time.');
    } else {
      console.log('⚠️  Database file not found');
      console.log('📁 Path:', DB_PATH);
    }
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
}

console.log('🗑️  Clearing SecDove database...\n');
clearDatabase();
