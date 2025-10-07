import { verifyDatabase, ensureDatabaseIntegrity } from '../utils/databaseVerification.js';

console.log('╔════════════════════════════════════════╗');
console.log('║   SecureDove Database Verification    ║');
console.log('╚════════════════════════════════════════╝\n');

async function runVerification() {
  try {
    await ensureDatabaseIntegrity();
    
    console.log('\n✅ Database verification complete - all checks passed!');
    console.log('\nDatabase is ready for use.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database verification failed!');
    console.error('Error:', error.message);
    console.log('\nPlease run: npm run init-db');
    process.exit(1);
  }
}

runVerification();
