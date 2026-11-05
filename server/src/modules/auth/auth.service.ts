import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../common/errors/AppError';
import * as queries from './auth.queries';
import { AuthUser } from '../../types/auth';
import { getEffectivePermissions } from './permissions.service';

export async function login(email: string, passwordPlain: string) {
  const user = await queries.findUserByEmail(email);

  if (!user || !user.is_active) {
    throw new AppError('UNAUTHENTICATED', 'Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(passwordPlain, user.password_hash);
  if (!isValid) {
    throw new AppError('UNAUTHENTICATED', 'Invalid email or password', 401);
  }

  const permissions = await getEffectivePermissions(Number(user.id));

  const token = jwt.sign(
    {
      id: Number(user.id),
      role: user.role_name,
      permissions,
      tokenVersion: Number(user.token_version),
    },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  await queries.updateLastLogin(user.id);

  const authUser: AuthUser = {
    id: Number(user.id),
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

  const permissions = await getEffectivePermissions(Number(user.id));

  return {
    id: Number(user.id),
    fullName: user.full_name,
    email: user.email,
    role: user.role_name,
    permissions,
  };
}

export async function changePassword(userId: number, currentPlain: string, newPlain: string) {
  const user = await queries.findUserById(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

  //Check current password is correct
  const isValid = await bcrypt.compare(currentPlain, user.password_hash);
  if (!isValid) {
    throw new AppError('VALIDATION_ERROR', 'Incorrect current password', 400);
  }

  // strictly Check if new password is the same as the current one
  const isSamePassword = await bcrypt.compare(newPlain, user.password_hash);
  if (isSamePassword) {
    throw new AppError(
      'VALIDATION_ERROR',
      'New password cannot be the same as the current password',
      400
    );
  }

  //hash and save the new password
  const newHash = await bcrypt.hash(newPlain, 10);
  await queries.updatePassword(userId, newHash);
  await queries.incrementTokenVersion(userId);
}