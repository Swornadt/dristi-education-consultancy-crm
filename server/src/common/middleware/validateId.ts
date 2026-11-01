import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function validateId(paramName: string = 'id') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const id = Number(req.params[paramName]);
    if (isNaN(id) || id <= 0) {
      return next(new AppError('VALIDATION_ERROR', `Invalid ${paramName} parameter`, 400));
    }
    next();
  };
}