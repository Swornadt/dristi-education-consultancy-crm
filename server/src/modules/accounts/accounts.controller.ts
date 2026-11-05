import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { JwtPayload } from '../../types/auth';
import * as service from './accounts.service';

// ── Categories ────────────────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listCategories());
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createCategory(req.body));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateCategory(Number(req.params.id), req.body));
});

// ── Entries ───────────────────────────────────────────────────────────────────

export const listEntries = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listEntries(req.query));
});

export const getEntry = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getEntry(Number(req.params.id)));
});

export const createEntry = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createEntry(req.user as JwtPayload, req.body));
});

export const updateEntry = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateEntry(Number(req.params.id), req.body));
});

export const deleteEntry = asyncHandler(async (req: Request, res: Response) => {
  await service.deleteEntry(Number(req.params.id));
  res.status(204).send();
});

// ── Summary ───────────────────────────────────────────────────────────────────

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getSummary(req.query.month as string | undefined));
});