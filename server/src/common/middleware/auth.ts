import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';
import { JwtPayload } from '../../types/auth';
import { pool } from '../../config/db';

export async function verifyJWT(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHENTICATED', 'Missing or invalid token', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;

    const { rows } = await pool.query(
      `SELECT token_version, is_active FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!rows[0] || !rows[0].is_active) {
      return next(new AppError('UNAUTHENTICATED', 'User is deactivated or deleted', 401));
    }

    if (rows[0].token_version !== decoded.tokenVersion) {
      return next(new AppError('UNAUTHENTICATED', 'Token has been revoked', 401));
    }

    next();
  } catch (err) {
    next(new AppError('UNAUTHENTICATED', 'Expired or invalid token', 401));
  }
}