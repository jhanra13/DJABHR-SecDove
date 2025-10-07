import { initializeDatabase, closeDatabase } from '../src/config/database.js';

async function initDatabase() {
  try {
    console.log('Initializing SecDove database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully!');
    console.log('📁 Database file: ./data/secdove.db');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

initDatabase();