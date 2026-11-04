export const TOKEN_KEY = 'crm_token';
const NOTICE_KEY = 'crm_login_notice';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// A one-time message for the login page (e.g. "your session expired"). Read once, then cleared.
export const setLoginNotice = (text) => {
  try {
    sessionStorage.setItem(NOTICE_KEY, text);
  } catch {
    /* storage unavailable: skip the notice */
  }
};
export const takeLoginNotice = () => {
  try {
    const text = sessionStorage.getItem(NOTICE_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    return text;
  } catch {
    return null;
  }
};
