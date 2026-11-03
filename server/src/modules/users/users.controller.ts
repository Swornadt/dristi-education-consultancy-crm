import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './users.service';
import { AppError } from '../../common/errors/AppError';

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
  const data = await service.update(
    Number(req.params.id),
    req.body,
    req.user!.role,
    Number(req.user!.id)
  );
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

export const getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.getUserPermissions(Number(req.params.id));
  res.json(data);
});

export const replacePermissions = asyncHandler(async (req: Request, res: Response) => {
  if (Number(req.params.id) === Number(req.user!.id)) {
    throw new AppError('CONFLICT', 'Cannot change your own permissions', 409);
  }
  const data = await service.replaceUserOverrides(Number(req.params.id), req.body.overrides);
  res.json(data);
});