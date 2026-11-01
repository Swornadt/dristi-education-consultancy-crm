// In-memory fake of the users and roles endpoints (admin only), plus the "assignable users" list.
// Passwords and deactivation are connected to the mock login, so resetting a password or
// deactivating one of the three demo accounts really changes whether it can sign in.
import { ApiError } from '../api/ApiError';
import { PERMISSION_MODULES } from '../config/permissionModules';
import { computeEffective } from '../utils/permissions';
import { MIN_PASSWORD_LENGTH } from '../utils/password';
import {
  ROLE_PERMISSIONS, getMockCurrentUser, getMockOverrides, setMockOverrides, setMockPassword, setMockRolePermissions, setMockUserActive,
} from './auth';
import { USER_NAMES } from './data';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const validation = (details) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const ROLES = [
  { id: 1, name: 'admin', description: 'Full access; manages users, catalog, accounts and reports' },
  { id: 2, name: 'counselor', description: 'Manages own assigned leads, students and applications' },
  { id: 3, name: 'front_desk', description: 'Captures inquiries and creates follow-up tasks' },
];

const users = [
  { id: 1, fullName: 'Admin User', email: 'admin@example.com', roleId: 1, isActive: true, lastLoginAt: daysAgo(0), createdAt: daysAgo(60) },
  { id: 3, fullName: 'Asha Rai', email: 'counselor@example.com', roleId: 2, isActive: true, lastLoginAt: daysAgo(1), createdAt: daysAgo(55) },
  { id: 4, fullName: 'Bikash Shrestha', email: 'bikash@example.com', roleId: 2, isActive: true, lastLoginAt: daysAgo(2), createdAt: daysAgo(50) },
  { id: 5, fullName: 'Front Desk', email: 'frontdesk@example.com', roleId: 3, isActive: true, lastLoginAt: daysAgo(0), createdAt: daysAgo(55) },
  { id: 6, fullName: 'Sita Gurung', email: 'sita@example.com', roleId: 2, isActive: false, lastLoginAt: daysAgo(40), createdAt: daysAgo(45) },
];
let nextUserId = 7;

const roleOf = (id) => ROLES.find((r) => r.id === Number(id));
const serialize = ({ roleId, ...rest }) => copy({ ...rest, role: roleOf(roleId).name, hasOverrides: getMockOverrides(rest.id).length > 0 });

function adminOnly(action) {
  const me = getMockCurrentUser();
  if (!me) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  if (!me.permissions.some((p) => p.module === 'users' && p.action === action)) {
    throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  }
  return me;
}

const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? ''));

// ---------- users ----------
export async function listUsers(params = {}) {
  await delay();
  adminOnly('view');
  const { page = 1, limit = 20, role, isActive, q } = params;
  let rows = [...users];
  if (role) rows = rows.filter((u) => roleOf(u.roleId).name === role);
  if (isActive !== undefined && isActive !== '') rows = rows.filter((u) => u.isActive === (isActive === true || isActive === 'true'));
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((u) => u.fullName.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));
  }
  rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  return {
    data: rows.slice(start, start + Number(limit)).map(serialize),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}

export async function createUser(payload) {
  await delay();
  adminOnly('create');
  const details = [];
  if (!payload.fullName?.trim()) details.push({ field: 'fullName', message: 'Enter a name.' });
  if (!validEmail(payload.email)) details.push({ field: 'email', message: 'Enter a valid email address.' });
  if (!roleOf(payload.roleId)) details.push({ field: 'roleId', message: 'Choose a role.' });
  if (!payload.password || payload.password.length < MIN_PASSWORD_LENGTH) {
    details.push({ field: 'password', message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (details.length) throw validation(details);
  if (users.some((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase())) {
    throw new ApiError(409, 'CONFLICT', 'A user with that email already exists.');
  }
  const user = {
    id: nextUserId++, fullName: payload.fullName.trim(), email: payload.email.trim(), roleId: Number(payload.roleId),
    isActive: true, lastLoginAt: null, createdAt: new Date().toISOString(),
  };
  users.push(user);
  USER_NAMES[user.id] = user.fullName; // so other mocks can show this person's name
  return serialize(user);
}

export async function updateUser(id, payload) {
  await delay();
  const me = adminOnly('update');
  const user = users.find((u) => u.id === Number(id));
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  const isSelf = user.id === me.id;

  if ('fullName' in payload && !payload.fullName?.trim()) throw validation([{ field: 'fullName', message: 'Enter a name.' }]);
  if ('roleId' in payload) {
    if (!roleOf(payload.roleId)) throw validation([{ field: 'roleId', message: 'Choose a role.' }]);
    if (isSelf && Number(payload.roleId) !== user.roleId) throw new ApiError(409, 'CONFLICT', "You can't change your own role.");
  }
  if ('isActive' in payload && isSelf && !payload.isActive) throw new ApiError(409, 'CONFLICT', "You can't deactivate your own account.");
  if ('password' in payload && (!payload.password || payload.password.length < MIN_PASSWORD_LENGTH)) {
    throw validation([{ field: 'password', message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }]);
  }

  if ('fullName' in payload) {
    user.fullName = payload.fullName.trim();
    USER_NAMES[user.id] = user.fullName;
  }
  if ('roleId' in payload) user.roleId = Number(payload.roleId);
  if ('isActive' in payload) {
    user.isActive = Boolean(payload.isActive);
    setMockUserActive(user.id, user.isActive);
  }
  if ('password' in payload) setMockPassword(user.id, payload.password);
  return serialize(user);
}

// ---------- roles and assignable users ----------
export async function listRoles() {
  await delay();
  adminOnly('view');
  return copy(ROLES.map((r) => ({ ...r, permissions: ROLE_PERMISSIONS[r.name] ?? [] })));
}

// Any signed-in user can fetch this (used by assignment dropdowns): active counselors only.
export function getAssignableUsers() {
  return users
    .filter((u) => u.isActive && roleOf(u.roleId).name === 'counselor')
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((u) => ({ id: u.id, fullName: u.fullName }));
}

// ---------- granular permissions ----------
// Only people whose role is admin may edit roles or overrides. This is deliberately not a normal permission:
// otherwise someone granted "users: edit" could give themselves anything.
function adminRoleOnly() {
  const me = getMockCurrentUser();
  if (!me) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  if (me.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  return me;
}

const MODULES = new Map(PERMISSION_MODULES.map((m) => [m.key, m]));
const bad = (message) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'permissions', message }]);

function checkEntry(entry, { override }) {
  const module = MODULES.get(entry.module);
  if (!module || !module.actions.includes(entry.action)) throw bad(`Unknown permission ${entry.module}:${entry.action}.`);
  if (override && !['grant', 'deny'].includes(entry.effect)) throw bad('Each override must be a grant or a deny.');
  if (!override || entry.effect === 'grant') {
    if (!['own', 'all'].includes(entry.scope)) throw bad(`Choose own or all for ${entry.module}:${entry.action}.`);
    if (!module.scoped && entry.scope !== 'all') throw bad(`${module.label} can only be granted for all.`);
  }
}

export async function updateRolePermissions(roleId, permissions) {
  await delay();
  adminRoleOnly();
  const role = roleOf(roleId);
  if (!role) throw new ApiError(404, 'NOT_FOUND', 'Role not found.');
  if (role.name === 'admin') throw new ApiError(409, 'CONFLICT', 'The admin role always has full access and cannot be edited.');
  if (!Array.isArray(permissions)) throw bad('Send the full list of permissions.');
  const seen = new Set();
  permissions.forEach((p) => {
    checkEntry(p, { override: false });
    const key = `${p.module}:${p.action}`;
    if (seen.has(key)) throw bad(`${key} is listed twice.`);
    seen.add(key);
  });
  permissions.forEach((p) => {
    if (p.action !== 'view' && !seen.has(`${p.module}:view`)) throw bad(`${p.module}:${p.action} also needs ${p.module}:view.`);
  });
  setMockRolePermissions(role.name, permissions.map(({ module, action, scope }) => ({ module, action, scope })));
  return copy({ ...role, permissions: ROLE_PERMISSIONS[role.name] });
}

function userPermissionsView(user) {
  const role = roleOf(user.roleId);
  const base = ROLE_PERMISSIONS[role.name] ?? [];
  const overrides = getMockOverrides(user.id);
  return copy({ role: { id: role.id, name: role.name }, base, overrides, effective: computeEffective(base, overrides) });
}

export async function getUserPermissions(id) {
  await delay();
  adminRoleOnly();
  const user = users.find((u) => u.id === Number(id));
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  return userPermissionsView(user);
}

export async function setUserPermissions(id, overrides) {
  await delay();
  const me = adminRoleOnly();
  const user = users.find((u) => u.id === Number(id));
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  if (roleOf(user.roleId).name === 'admin') throw new ApiError(409, 'CONFLICT', 'Admins already have full access; their permissions cannot be customized.');
  if (user.id === me.id) throw new ApiError(409, 'CONFLICT', "You can't change your own permissions.");
  if (!Array.isArray(overrides)) throw bad('Send the full list of overrides.');
  const seen = new Set();
  overrides.forEach((o) => {
    checkEntry(o, { override: true });
    const key = `${o.module}:${o.action}`;
    if (seen.has(key)) throw bad(`${key} is listed twice.`);
    seen.add(key);
  });
  setMockOverrides(user.id, overrides.map((o) => (o.effect === 'deny' ? { module: o.module, action: o.action, effect: 'deny' } : { module: o.module, action: o.action, effect: 'grant', scope: o.scope })));
  return userPermissionsView(user);
}
