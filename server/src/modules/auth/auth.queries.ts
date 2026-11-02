import { pool } from '../../config/db';
import { Permission } from '../../types/auth';

export interface DbUser {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role_name: string;
  is_active: boolean;
  token_version: number;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    `SELECT u.id, u.full_name, u.email, u.password_hash, r.name as role_name, u.is_active, u.token_version
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE lower(u.email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id: number): Promise<DbUser | null> {
  const { rows } = await pool.query<DbUser>(
    `SELECT u.id, u.full_name, u.email, u.password_hash, r.name as role_name, u.is_active, u.token_version
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getUserPermissions(userId: number): Promise<Permission[]> {
  const { rows } = await pool.query<Permission>(
    `SELECT p.module, p.action, rp.scope
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     JOIN users u ON u.role_id = rp.role_id
     WHERE u.id = $1`,
    [userId]
  );
  return rows;
}

export async function updateLastLogin(userId: number): Promise<void> {
  await pool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
}

export async function updatePassword(userId: number, hash: string): Promise<void> {
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
}

export async function incrementTokenVersion(userId: number) {
  await pool.query(`UPDATE users SET token_version = token_version + 1 WHERE id = $1`, [userId]);
}