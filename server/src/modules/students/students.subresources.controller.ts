import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './students.subresources.service';
import { JwtPayload } from '../../types/auth';
import { AppError } from '../../common/errors/AppError';
import path from 'path';
import fs from 'fs';

export const createEducation = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createEducation(req.user as JwtPayload, Number(req.params.id), req.body);
  res.status(201).json(data);
});

export const updateEducation = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateEducation(req.user as JwtPayload, Number(req.params.id), Number(req.params.eid), req.body);
  res.json(data);
});

export const deleteEducation = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteEducation(req.user as JwtPayload, Number(req.params.id), Number(req.params.eid));
  res.status(204).send();
});

export const createTestScore = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createTestScore(req.user as JwtPayload, Number(req.params.id), req.body);
  res.status(201).json(data);
});

export const updateTestScore = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateTestScore(req.user as JwtPayload, Number(req.params.id), Number(req.params.sid), req.body);
  res.json(data);
});

export const deleteTestScore = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteTestScore(req.user as JwtPayload, Number(req.params.id), Number(req.params.sid));
  res.status(204).send();
});

export const getDocuments = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getDocuments(req.user as JwtPayload, Number(req.params.id));
  res.json(data);
});

export const addChecklistItem = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.addChecklistItem(req.user as JwtPayload, Number(req.params.id), req.body.documentTypeId);
  res.status(201).json(data);
});

export const updateChecklistItem = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateChecklistItem(req.user as JwtPayload, Number(req.params.id), Number(req.params.itemId), req.body);
  res.json(data);
});

export const uploadChecklistFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('VALIDATION_ERROR', 'No file uploaded', 400);
  const data = await service.uploadChecklistFile(req.user as JwtPayload, Number(req.params.id), Number(req.params.itemId), req.file);
  res.status(201).json(data);
});

export const deleteChecklistItem = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteChecklistItem(req.user as JwtPayload, Number(req.params.id), Number(req.params.itemId));
  res.status(204).send();
});

export const streamFile = asyncHandler(async (req: Request, res: Response) => {
  const fileId = Number(req.params.fileId);
  if (isNaN(fileId)) {
    throw new AppError('VALIDATION_ERROR', 'Invalid file ID', 400);
  }

  const file = await service.streamFile(req.user as JwtPayload, fileId);
  const download = req.query.download === '1';
  const disposition = download ? 'attachment' : 'inline';

  if (!fs.existsSync(file.stored_path)) {
    throw new AppError('NOT_FOUND', 'File not found on disk', 404);
  }

  res.setHeader('Content-Disposition', `${disposition}; filename="${path.basename(file.original_name)}"`);
  res.setHeader('Content-Type', file.mime_type);
  
  const stream = fs.createReadStream(file.stored_path);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to stream file' } });
    }
  });
  
  stream.pipe(res);
});