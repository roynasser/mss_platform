import { readFile } from 'fs/promises';
import path from 'path';
import { connectDB, getDB, closeDB } from './connection';

async function runMigration() {
  try {
    await connectDB();
    const db = getDB();
    
    console.log('Running database migration...');
    
    // Read and execute the initial schema
    const schemaPath = path.join(__dirname, '../../../../database/migrations/001_initial_schema.sql');
    const schemaSql = await readFile(schemaPath, 'utf-8');
    
    // Execute the schema
    await db.query(schemaSql);
    
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration };