import api from './client';
import { unwrapList } from './helpers';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/lookups';

// GET /countries
export const listCountries = () =>
  USE_MOCK ? mock.listCountries() : api.get('/countries', { params: { limit: 100 } }).then((r) => unwrapList(r.data));

// GET /users/assignable -> [{ id, fullName }]
export const listAssignableUsers = () =>
  USE_MOCK ? mock.listAssignableUsers() : api.get('/users/assignable').then((r) => unwrapList(r.data));
