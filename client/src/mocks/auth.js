// Mock data so the UI can be built before the backend exists.
// The permissions mirror the seed data in schema.sql.
import { ApiError } from '../api/ApiError';
import { getToken } from '../api/token';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const MODULES = ['users', 'leads', 'tasks', 'students', 'documents', 'applications', 'catalog', 'accounts', 'dashboard'];
const ACTIONS = ['view', 'create', 'update', 'delete'];

const grant = (module, actions, scope) => actions.map((action) => ({ module, action, scope }));

const adminPermissions = MODULES.flatMap((m) => grant(m, ACTIONS, 'all'));

const counselorPermissions = [
  ...grant('leads', ['view', 'create', 'update'], 'own'),
  ...grant('tasks', ['view', 'create', 'update', 'delete'], 'own'),
  ...grant('students', ['view', 'create', 'update'], 'own'),
  ...grant('documents', ['view', 'create', 'update', 'delete'], 'own'),
  ...grant('applications', ['view', 'create', 'update'], 'own'),
  ...grant('catalog', ['view'], 'all'),
  ...grant('dashboard', ['view'], 'own'),
];

const frontDeskPermissions = [
  ...grant('leads', ['view', 'create', 'update'], 'own'),
  ...grant('tasks', ['view', 'create', 'update'], 'own'),
  ...grant('catalog', ['view'], 'all'),
];

const USERS = {
  admin: { id: 1, fullName: 'Admin User', email: 'admin@example.com', role: 'admin', permissions: adminPermissions },
  counselor: { id: 3, fullName: 'Asha Rai', email: 'counselor@example.com', role: 'counselor', permissions: counselorPermissions },
  front_desk: { id: 5, fullName: 'Front Desk', email: 'frontdesk@example.com', role: 'front_desk', permissions: frontDeskPermissions },
};

export const MOCK_PASSWORD = 'password123';

// Changed passwords and deactivated users, kept in memory (reset when the page is refreshed).
const PASSWORDS = new Map();
const INACTIVE = new Set();
export const setMockPassword = (userId, password) => PASSWORDS.set(userId, password);
export const setMockUserActive = (userId, isActive) => (isActive ? INACTIVE.delete(userId) : INACTIVE.add(userId));

// The permission matrix per role, as the mock login hands it out.
export const ROLE_PERMISSIONS = {
  admin: adminPermissions,
  counselor: counselorPermissions,
  front_desk: frontDeskPermissions,
};
export const MOCK_ACCOUNTS = Object.values(USERS).map(({ email, role, fullName }) => ({ email, role, fullName }));

export async function mockLogin(email, password) {
  await delay();
  const user = Object.values(USERS).find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || password !== (PASSWORDS.get(user.id) ?? MOCK_PASSWORD)) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Incorrect email or password.');
  }
  if (INACTIVE.has(user.id)) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Your account is deactivated. Ask an admin for help.');
  }
  return { token: `mock-token-${user.role}`, user };
}

export async function mockMe() {
  await delay(150);
  const role = (getToken() || '').replace('mock-token-', '');
  const user = USERS[role];
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  return user;
}

// Used by other mock modules to know who is "calling the API".
export function getMockCurrentUser() {
  const role = (getToken() || '').replace('mock-token-', '');
  return USERS[role] ?? null;
}

// POST /auth/change-password
export async function mockChangePassword(currentPassword, newPassword) {
  await delay();
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  const details = [];
  if (currentPassword !== (PASSWORDS.get(user.id) ?? MOCK_PASSWORD)) {
    details.push({ field: 'currentPassword', message: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 8) details.push({ field: 'newPassword', message: 'Use at least 8 characters.' });
  if (details.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);
  PASSWORDS.set(user.id, newPassword);
}
