import { AppError } from '../../common/errors/AppError';
import { pool } from '../../config/db';
import * as queries from './roles.queries';

const VALID_MODULES = ['leads', 'tasks', 'applications', 'documents', 'students', 'dashboard', 'catalog', 'accounts', 'users'];
const VALID_ACTIONS = ['view', 'create', 'update', 'delete'];
const UNSCOPED_MODULES = ['catalog', 'accounts', 'users'];
const SCOPED_MODULES = ['leads', 'tasks', 'applications', 'documents', 'students', 'dashboard'];

export async function replaceRolePermissions(roleId: number, permissions: any[]) {
  const role = await queries.getRoleById(roleId);
  if (!role) throw new AppError('NOT_FOUND', 'Role not found', 404);
  if (role.name === 'admin') throw new AppError('CONFLICT', 'Cannot edit admin role', 409);

  const seen = new Set<string>();
  for (const p of permissions) {
    if (!VALID_MODULES.includes(p.module)) {
      throw new AppError('VALIDATION_ERROR', `Unknown module: ${p.module}`, 400);
    }
    if (!VALID_ACTIONS.includes(p.action)) {
      throw new AppError('VALIDATION_ERROR', `Unknown action: ${p.action}`, 400);
    }
    if (UNSCOPED_MODULES.includes(p.module) && p.scope === 'own') {
      throw new AppError('VALIDATION_ERROR', `${p.module} does not support own scope`, 400);
    }
    if (SCOPED_MODULES.includes(p.module) && !['own', 'all'].includes(p.scope)) {
      throw new AppError('VALIDATION_ERROR', `${p.module} requires own or all scope`, 400);
    }
    const key = `${p.module}:${p.action}`;
    if (seen.has(key)) {
      throw new AppError('VALIDATION_ERROR', `Duplicate permission: ${key}`, 400);
    }
    seen.add(key);
  }

  const hasViews = new Set(permissions.filter((p: any) => p.action === 'view').map((p: any) => p.module));
  for (const p of permissions) {
    if (p.action !== 'view' && !hasViews.has(p.module)) {
      throw new AppError('VALIDATION_ERROR', `Cannot grant ${p.action} on ${p.module} without view`, 400);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

    for (const p of permissions) {
      const permId = await queries.getPermissionId(p.module, p.action);
      if (!permId) throw new AppError('VALIDATION_ERROR', `Unknown permission ${p.module}:${p.action}`, 400);
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id, scope) VALUES ($1, $2, $3)`,
        [roleId, permId, p.scope]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const updated = await queries.getRolePermissions(roleId);
  return { id: Number(role.id), name: role.name, description: role.description, permissions: updated };
}