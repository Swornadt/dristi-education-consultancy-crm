import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { JwtPayload } from '../../types/auth';
import * as service from './dashboard.service';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getSummary(req.user as JwtPayload, req.query.month as string | undefined));
});
