import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create a default admin user
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

    const insertAdminQuery = `
      INSERT INTO users (full_name, email, password_hash, role_id)
      SELECT 'Admin', 'admin@example.com', $1, id
      FROM roles WHERE name = 'admin'
      ON CONFLICT DO NOTHING;
    `;

    await pool.query(insertAdminQuery, [passwordHash]);
    console.log('Default admin user created (admin@example.com / ChangeMe123!)');

  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});