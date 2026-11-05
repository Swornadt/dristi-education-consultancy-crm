import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function validateId(paramName: string = 'id') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const idStr = req.params[paramName];
    const id = Number(idStr);
    
    if (!Number.isInteger(id) || id <= 0 || isNaN(id)) {
      return next(new AppError('VALIDATION_ERROR', `Invalid ${paramName} parameter`, 400));
    }
    next();
  };
}