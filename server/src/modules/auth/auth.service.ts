// src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/AppError';
import * as queries from './auth.queries';
import { AuthUser } from '../../types/auth';

export async function login(email: string, passwordPlain: string) {
  const user = await queries.findUserByEmail(email);
  
  if (!user || !user.is_active) {
    throw new AppError('UNAUTHENTICATED', 'Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(passwordPlain, user.password_hash);
  if (!isValid) {
    throw new AppError('UNAUTHENTICATED', 'Invalid email or password', 401);
  }

  const permissions = await queries.getUserPermissions(user.id);

  // Set token lifetime 8 hours
  const token = jwt.sign(
    { id: user.id, role: user.role_name },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  await queries.updateLastLogin(user.id);

  const authUser: AuthUser = {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_name,
    permissions,
  };

  return { token, user: authUser };
}

export async function getMe(userId: number) {
  const user = await queries.findUserById(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  const permissions = await queries.getUserPermissions(user.id);

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_name,
    permissions,
  };
}

export async function changePassword(userId: number, currentPlain: string, newPlain: string) {
  const user = await queries.findUserById(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  const isValid = await bcrypt.compare(currentPlain, user.password_hash);
  if (!isValid) {
    throw new AppError('VALIDATION_ERROR', 'Incorrect current password', 400);
  }

  const newHash = await bcrypt.hash(newPlain, 10);
  await queries.updatePassword(userId, newHash);
}