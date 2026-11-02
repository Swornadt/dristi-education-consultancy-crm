import { pool } from '../../config/db';

export async function getRoleById(roleId: number) {
  const { rows } = await pool.query(
    `SELECT id, name, description FROM roles WHERE id = $1`,
    [roleId]
  );
  return rows[0] || null;
}

export async function getRolePermissions(roleId: number) {
  const { rows } = await pool.query(
    `SELECT p.module, p.action, rp.scope
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  return rows;
}

export async function getPermissionId(module: string, action: string) {
  const { rows } = await pool.query(
    `SELECT id FROM permissions WHERE module = $1 AND action = $2`,
    [module, action]
  );
  return rows[0]?.id || null;
}

export async function getUserRole(userId: number) {
  const { rows } = await pool.query(
    `SELECT r.id, r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [userId]
  );
  return rows[0] || null;
}