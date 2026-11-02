import bcrypt from 'bcryptjs';
import { AppError } from '../../common/errors/AppError';
import * as queries from './users.queries';
import * as roleQueries from '../roles/roles.queries'
import { pool } from '../../config/db';
import { getEffectivePermissions } from '../auth/permissions.service';

const mapUser = (u: any) => ({
  id: Number(u.id),
  fullName: u.full_name,
  email: u.email,
  role: u.role_name,
  isActive: u.is_active,
  lastLoginAt: u.last_login_at,
  createdAt: u.created_at,
});

const VALID_MODULES = ['leads', 'tasks', 'applications', 'documents', 'students', 'dashboard', 'catalog', 'accounts', 'users'];
const VALID_ACTIONS = ['view', 'create', 'update', 'delete'];
const UNSCOPED_MODULES = ['catalog', 'accounts', 'users'];

export async function list(filters: any) {
  const users = await queries.listUsers(filters);
  const result = [];
  for (const u of users) {
    const has = await queries.hasOverrides(Number(u.id));
    result.push({ ...mapUser(u), hasOverrides: has });
  }
  return result;
}

export async function getOne(id: number) {
  const user = await queries.getUserById(id);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  const has = await queries.hasOverrides(Number(user.id));
  return { ...mapUser(user), hasOverrides: has };
}

export async function create(data: any) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  try {
    const id = await queries.createUser({ ...data, passwordHash });
    return getOne(id);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Email already exists', 409);
    }
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Invalid roleId: role does not exist', 400);
    }
    throw err;
  }
}

export async function update(id: number, data: any, callerRole: string, callerId: number) {
  await getOne(id);
  
  if (data.roleId && callerRole !== 'admin') {
    throw new AppError('FORBIDDEN', 'Only admins can change user roles', 403);
  }

  if (Number(id) !== Number(callerId) && callerRole !== 'admin') {
    throw new AppError('FORBIDDEN', 'You can only edit your own profile', 403);
  }
  if (Number(id) === Number(callerId) && callerRole === 'admin' && data.roleId && Number(data.roleId) !== 1) {
    throw new AppError('CONFLICT', 'Admins cannot demote themselves', 409);
  }

  const updateData = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  try {
    await queries.updateUser(id, updateData);
    return getOne(id);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Email already exists', 409);
    }
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Invalid roleId: role does not exist', 400);
    }
    throw err;
  }
}

export async function getAssignable() {
  const rows = await queries.getAssignableCounselors();
  return rows.map((r) => ({ id: Number(r.id), fullName: r.full_name }));
}

export async function getRoles() {
  return queries.getRolesWithPermissions();
}

export async function getUserPermissions(userId: number) {
  const user = await queries.getUserById(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  const role = await roleQueries.getUserRole(userId);
  const base = await roleQueries.getRolePermissions(role.id);
  const overrides = await queries.getUserOverrides(userId);
  const effective = await getEffectivePermissions(userId);

  return { role: { id: Number(role.id), name: role.name }, base, overrides, effective };
}

export async function replaceUserOverrides(userId: number, overrides: any[]) {
  const user = await queries.getUserById(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  const role = await roleQueries.getUserRole(userId);
  if (role.name === 'admin') {
    throw new AppError('CONFLICT', 'Cannot set overrides on admin', 409);
  }

  const seen = new Set<string>();
  for (const o of overrides) {
    if (!VALID_MODULES.includes(o.module)) {
      throw new AppError('VALIDATION_ERROR', `Unknown module: ${o.module}`, 400);
    }
    if (!VALID_ACTIONS.includes(o.action)) {
      throw new AppError('VALIDATION_ERROR', `Unknown action: ${o.action}`, 400);
    }
    if (!['grant', 'deny'].includes(o.effect)) {
      throw new AppError('VALIDATION_ERROR', `Invalid effect: ${o.effect}`, 400);
    }
    if (o.effect === 'grant' && !['own', 'all'].includes(o.scope)) {
      throw new AppError('VALIDATION_ERROR', 'Grant requires own or all scope', 400);
    }
    if (o.effect === 'grant' && UNSCOPED_MODULES.includes(o.module) && o.scope === 'own') {
      throw new AppError('VALIDATION_ERROR', `${o.module} does not support own scope`, 400);
    }
    if (o.effect === 'deny' && o.scope) {
      throw new AppError('VALIDATION_ERROR', 'Deny must not have scope', 400);
    }
    const key = `${o.module}:${o.action}`;
    if (seen.has(key)) {
      throw new AppError('VALIDATION_ERROR', `Duplicate override: ${key}`, 400);
    }
    seen.add(key);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await queries.deleteUserOverrides(client, userId);

    for (const o of overrides) {
      await queries.insertUserOverride(client, userId, o);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getUserPermissions(userId);
}