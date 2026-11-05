import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './applications.service';
import { JwtPayload } from '../../types/auth';

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.list(req.user as JwtPayload, req.query) });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOne(req.user as JwtPayload, Number(req.params.id)));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.create(req.user as JwtPayload, req.body));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.update(req.user as JwtPayload, Number(req.params.id), req.body));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateStatus(req.user as JwtPayload, Number(req.params.id), req.body.status, req.body.note));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.user as JwtPayload, Number(req.params.id));
  res.status(204).send();
});