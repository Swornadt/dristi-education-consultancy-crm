import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  console.log(`Found ${files.length} migration file(s).`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      console.log(`Running migration: ${file}...`);
      await pool.query(sql);
      console.log(`Success: ${file}`);
    } catch (err: any) {
      console.error(`Failed: ${file}`);
      console.error(err.message);
      throw err;
    }
  }

  console.log('All migrations completed successfully.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});