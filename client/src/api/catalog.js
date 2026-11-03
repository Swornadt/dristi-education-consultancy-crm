import api from './client';
import { normalizePage } from './pagination';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/catalog';

const page = (path, mockFn) => (params) =>
  USE_MOCK ? mockFn(params) : api.get(path, { params }).then((r) => normalizePage(r.data));
const create = (path, mockFn) => (payload) => (USE_MOCK ? mockFn(payload) : api.post(path, payload).then((r) => r.data));
const update = (path, mockFn) => (id, payload) =>
  USE_MOCK ? mockFn(id, payload) : api.patch(`${path}/${id}`, payload).then((r) => r.data);

// Lists return { data, meta }. Admins can pass includeInactive: true.
export const listCountryPage = page('/countries', mock.listCountries);
export const createCountry = create('/countries', mock.createCountry);
export const updateCountry = update('/countries', mock.updateCountry);

export const listUniversityPage = page('/universities', mock.listUniversities);
export const createUniversity = create('/universities', mock.createUniversity);
export const updateUniversity = update('/universities', mock.updateUniversity);

export const listProgramPage = page('/programs', mock.listPrograms);
export const createProgram = create('/programs', mock.createProgram);
export const updateProgram = update('/programs', mock.updateProgram);

export const listIntakePage = page('/intakes', mock.listIntakes);
export const createIntake = create('/intakes', mock.createIntake);
export const updateIntake = update('/intakes', mock.updateIntake);
