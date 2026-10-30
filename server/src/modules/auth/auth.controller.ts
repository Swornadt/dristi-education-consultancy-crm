import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './auth.service';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await service.login(email, password);
  res.status(200).json(result);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getMe(req.user!.id);
  res.status(200).json(result);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await service.changePassword(req.user!.id, currentPassword, newPassword);
  res.status(204).send();
});