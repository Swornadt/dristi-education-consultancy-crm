import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './leads.service';
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

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.user as JwtPayload, Number(req.params.id));
  res.status(204).send();
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateStatus(req.user as JwtPayload, Number(req.params.id), req.body.status, req.body.lostReason));
});

export const assign = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.assign(req.user as JwtPayload, Number(req.params.id), req.body.assignedTo));
});

export const getActivities = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.getActivities(req.user as JwtPayload, Number(req.params.id)) });
});

export const createActivity = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createActivity(req.user as JwtPayload, Number(req.params.id), req.body));
});
export const convert = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.convert(req.user as JwtPayload, Number(req.params.id), req.body);
  res.status(201).json(data);
});