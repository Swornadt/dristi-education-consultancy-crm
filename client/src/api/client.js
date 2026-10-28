import axios from 'axios';
import { ApiError } from './ApiError';
import { getToken } from './token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 15000,
});

// AuthContext registers a callback here so an expired token logs the user out.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data?.error;

    // A 401 from the login call itself just means "wrong password", not "session expired".
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (status === 401 && !isLoginCall && onUnauthorized) onUnauthorized();

    const code = body?.code ?? (error.response ? 'ERROR' : 'NETWORK_ERROR');
    const message =
      body?.message ?? (error.response ? 'Something went wrong. Please try again.' : 'Cannot reach the server.');
    return Promise.reject(new ApiError(status, code, message, body?.details ?? []));
  }
);

export default api;
