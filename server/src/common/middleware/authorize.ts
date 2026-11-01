import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function requirePermission(permissionString: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('UNAUTHENTICATED', 'Not authenticated', 401));
    }

    const [module, action] = permissionString.split(':');
    
    const hasPermission = req.user.permissions?.some(
      (p) => p.module === module && p.action === action
    );

    if (!hasPermission) {
      return next(new AppError('FORBIDDEN', 'You do not have permission to perform this action', 403));
    }

    next();
  };
}