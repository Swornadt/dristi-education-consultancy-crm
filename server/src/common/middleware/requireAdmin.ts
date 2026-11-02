import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return next(new AppError('FORBIDDEN', 'Only admins can access this', 403));
  }
  next();
}