import bcrypt from 'bcryptjs';
import { AppError } from '../../common/errors/AppError';
import * as queries from './users.queries';

const mapUser = (u: any) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  role: u.role_name,
  isActive: u.is_active,
  lastLoginAt: u.last_login_at,
  createdAt: u.created_at,
});
export async function list(filters: any) {
  const users = await queries.listUsers(filters);
  return users.map(mapUser);
}

export async function getOne(id: number) {
  const user = await queries.getUserById(id);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  return mapUser(user);
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
    throw err;
  }
}

export async function update(id: number, data: any) {
  await getOne(id);
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
    throw err;
  }
}

export async function getAssignable() {
  const rows = await queries.getAssignableCounselors();
  return rows.map((r) => ({ id: r.id, fullName: r.full_name }));
}

export async function getRoles() {
  return queries.getRolesWithPermissions();
}