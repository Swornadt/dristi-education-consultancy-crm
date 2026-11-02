import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import multer from 'multer';

export function globalErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // 1. Multer errors (file too large, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File exceeds the 10MB limit',
        },
      });
    }
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || undefined,
      },
    });
  }

  // 3. Malformed JSON body (Express body-parser error)
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON in request body',
      },
    });
  }

  // 4. Fallback
  console.error('Unhandled Error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
    },
  });
}