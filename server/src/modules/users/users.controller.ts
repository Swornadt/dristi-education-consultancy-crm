import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './users.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.list(req.query);
  res.json({ data });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getOne(Number(req.params.id));
  res.json(data);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.create(req.body);
  res.status(201).json(data);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.update(Number(req.params.id), req.body);
  res.json(data);
});

export const assignable = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getAssignable();
  res.json(data);
});

export const roles = asyncHandler(async (_req: Request, res: Response) => {
  const data = await service.getRoles();
  res.json(data);
});