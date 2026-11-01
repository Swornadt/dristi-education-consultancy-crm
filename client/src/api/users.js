import api from './client';
import { unwrapList } from './helpers';
import { normalizePage } from './pagination';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/users';

const body = (promise) => promise.then((res) => res.data);

// GET /users -> { data, meta }. params: role, isActive, q, page, limit
// user: { id, fullName, email, role, isActive, lastLoginAt, createdAt }
export const listUsers = (params) =>
  USE_MOCK ? mock.listUsers(params) : api.get('/users', { params }).then((r) => normalizePage(r.data));

// { fullName, email, password, roleId }
export const createUser = (payload) => (USE_MOCK ? mock.createUser(payload) : body(api.post('/users', payload)));

// { fullName?, roleId?, isActive?, password? }
export const updateUser = (id, payload) =>
  USE_MOCK ? mock.updateUser(id, payload) : body(api.patch(`/users/${id}`, payload));

// GET /roles -> [{ id, name, description, permissions: [{ module, action, scope }] }]
export const listRoles = () => (USE_MOCK ? mock.listRoles() : api.get('/roles').then((r) => unwrapList(r.data)));
