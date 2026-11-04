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

// Zod errors from the server come back as "body.fullName" / "query.page" (the validate middleware
// parses { body, query, params }). Forms use the bare field name, so strip the prefix here once.
const stripPrefix = (field) => (typeof field === 'string' ? field.replace(/^(body|query|params)\./, '') : field);
const normalizeDetails = (details) =>
  Array.isArray(details) ? details.map((d) => ({ ...d, field: stripPrefix(d.field) })) : [];

// Requests made with responseType: 'blob' (file downloads) deliver the JSON error body as a Blob.
async function readErrorBody(error) {
  const data = error.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.error;
    } catch {
      return undefined;
    }
  }
  return data?.error;
}

// Used only when the server did not send its own message.
function fallbackMessage(status, error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The server took too long to respond. Please try again.';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'You appear to be offline. Check your connection.';
    return 'Cannot reach the server.';
  }
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return 'We could not find what you were looking for.';
  if (status === 413) return 'That file is too large.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 502 || status === 503 || status === 504) return 'The server is unavailable right now. Please try again shortly.';
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return 'Something went wrong. Please try again.';
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    const status = error.response?.status ?? 0;
    const body = await readErrorBody(error);

    // A 401 from the login call itself just means "wrong password", not "session expired".
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (status === 401 && !isLoginCall && onUnauthorized) onUnauthorized();

    let code = body?.code;
    if (!code) {
      if (error.response) code = 'ERROR';
      else code = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'NETWORK_ERROR';
    }
    const message = body?.message ?? fallbackMessage(status, error);
    return Promise.reject(new ApiError(status, code, message, normalizeDetails(body?.details)));
  }
);

export default api;
