import api from './client';
import { mockChangePassword, mockLogin, mockMe } from '../mocks/auth';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// POST /auth/login -> { token, user: { id, fullName, email, role, permissions } }
export async function login(email, password) {
  if (USE_MOCK) return mockLogin(email, password);
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

// GET /auth/me -> the same user object (with permissions) as in the login response
export async function getMe() {
  if (USE_MOCK) return mockMe();
  const { data } = await api.get('/auth/me');
  return data;
}

// POST /auth/change-password { currentPassword, newPassword }
export async function changePassword(currentPassword, newPassword) {
  if (USE_MOCK) return mockChangePassword(currentPassword, newPassword);
  await api.post('/auth/change-password', { currentPassword, newPassword });
  return undefined;
}
