import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as service from './catalog.service';
import { JwtPayload } from '../../types/auth';

export const listCountries = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.listCountries(req.user as JwtPayload, req.query) });
});

export const createCountry = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createCountry(req.body));
});

export const updateCountry = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateCountry(Number(req.params.id), req.body));
});

export const listDocumentTypes = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.listDocumentTypes(req.user as JwtPayload, req.query) });
});

export const createDocumentType = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createDocumentType(req.body));
});

export const updateDocumentType = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateDocumentType(Number(req.params.id), req.body));
});

export const listUniversities = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.listUniversities(req.user as JwtPayload, req.query) });
});

export const createUniversity = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createUniversity(req.body));
});

export const updateUniversity = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateUniversity(Number(req.params.id), req.body));
});

export const listPrograms = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.listPrograms(req.user as JwtPayload, req.query) });
});

export const createProgram = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createProgram(req.body));
});

export const updateProgram = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateProgram(Number(req.params.id), req.body));
});

export const listIntakes = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await service.listIntakes(req.user as JwtPayload, req.query) });
});

export const createIntake = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await service.createIntake(req.body));
});

export const updateIntake = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.updateIntake(Number(req.params.id), req.body));
});