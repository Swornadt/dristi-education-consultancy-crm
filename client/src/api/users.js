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

// PUT /roles/:id/permissions { permissions: [{ module, action, scope }] } replaces the role's matrix.
// The admin role can't be edited (409). Returns the updated role.
export const updateRolePermissions = (roleId, permissions) =>
  USE_MOCK ? mock.updateRolePermissions(roleId, permissions) : body(api.put(`/roles/${roleId}/permissions`, { permissions }));

// GET /users/:id/permissions -> { role: { id, name }, base, overrides, effective }
//   base      = the role's permissions
//   overrides = [{ module, action, effect: 'grant' | 'deny', scope? }]  (scope required for grant)
//   effective = base with overrides applied
export const getUserPermissions = (id) => (USE_MOCK ? mock.getUserPermissions(id) : body(api.get(`/users/${id}/permissions`)));

// PUT /users/:id/permissions { overrides } replaces all of the person's overrides. Send [] to reset to the role.
export const setUserPermissions = (id, overrides) =>
  USE_MOCK ? mock.setUserPermissions(id, overrides) : body(api.put(`/users/${id}/permissions`, { overrides }));
