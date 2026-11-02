import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './roles.service';

export const replacePermissions = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.replaceRolePermissions(Number(req.params.id), req.body.permissions);
  res.json(data);
});