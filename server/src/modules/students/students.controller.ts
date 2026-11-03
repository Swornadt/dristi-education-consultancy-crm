import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './students.service';
import { JwtPayload } from '../../types/auth';

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.list(req.user as JwtPayload, req.query) });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOne(req.user as JwtPayload, Number(req.params.id)));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.update(req.user as JwtPayload, Number(req.params.id), req.body));
});

export const updatePreferredCountries = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updatePreferredCountries(req.user as JwtPayload, Number(req.params.id), req.body.countryIds));
});