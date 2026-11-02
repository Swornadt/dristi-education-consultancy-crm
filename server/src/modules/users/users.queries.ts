import { pool } from '../../config/db';

export interface DbUser {
  id: number;
  full_name: string;
  email: string;
  role_name: string;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

export async function listUsers(filters: { role?: string; isActive?: string | boolean; q?: string }) {
  let query = `
    SELECT u.id, u.full_name, u.email, r.name as role_name, u.is_active, u.last_login_at, u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.role) {
    params.push(filters.role);
    query += ` AND r.name = $${params.length}`;
  }
  if (filters.isActive !== undefined) {
    const activeBool = filters.isActive.toString() === 'true';
    params.push(activeBool);
    query += ` AND u.is_active = $${params.length}`;
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    query += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }

  query += ` ORDER BY u.created_at DESC`;

  const { rows } = await pool.query<DbUser>(query, params);
  return rows;
}

export async function getUserById(id: number) {
  const { rows } = await pool.query<DbUser>(
    `SELECT u.id, u.full_name, u.email, r.name as role_name, u.is_active, u.last_login_at, u.created_at
     FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, is_active)
     VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
    [data.fullName, data.email, data.passwordHash, data.roleId]
  );
  return rows[0].id;
}

export async function updateUser(id: number, data: any) {
  let query = `UPDATE users SET updated_at = now()`;
  const params: any[] = [];

  if (data.fullName) { params.push(data.fullName); query += `, full_name = $${params.length}`; }
  if (data.roleId) { params.push(data.roleId); query += `, role_id = $${params.length}`; }
  if (data.isActive !== undefined) { params.push(data.isActive); query += `, is_active = $${params.length}`; }
  if (data.passwordHash) { params.push(data.passwordHash); query += `, password_hash = $${params.length}`; }

  params.push(id);
  query += ` WHERE id = $${params.length}`;

  await pool.query(query, params);
}

export async function getAssignableCounselors() {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name FROM users u JOIN roles r ON r.id = u.role_id 
     WHERE r.name = 'counselor' AND u.is_active = TRUE ORDER BY u.full_name ASC`
  );
  return rows;
}

export async function getRolesWithPermissions() {
  const rolesRes = await pool.query(`SELECT id, name, description FROM roles ORDER BY id`);
  const permsRes = await pool.query(`
    SELECT rp.role_id, p.module, p.action, rp.scope
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
  `);

  return rolesRes.rows.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: permsRes.rows
      .filter((p) => p.role_id === role.id)
      .map((p) => ({
        module: p.module,
        action: p.action,
        scope: p.scope,
      })),
  }));
}