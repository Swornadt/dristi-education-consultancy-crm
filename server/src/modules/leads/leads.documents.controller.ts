import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as docsService from './leads.documents.service';
import { JwtPayload } from '../../types/auth';
import { AppError } from '../../common/errors/AppError';

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await docsService.list(req.user as JwtPayload, Number(req.params.id)) });
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('VALIDATION_ERROR', 'No file uploaded', 400);
  const data = await docsService.upload(req.user as JwtPayload, Number(req.params.id), req.file, req.body);
  res.status(201).json(data);
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await docsService.remove(req.user as JwtPayload, Number(req.params.id), Number(req.params.docId));
  res.status(204).send();
});