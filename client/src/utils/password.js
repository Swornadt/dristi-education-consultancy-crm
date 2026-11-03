// Random password without look-alike characters (no 0/O, 1/l/I). Uses the browser's secure random source.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function generatePassword(length = 12) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CHARS[v % CHARS.length]).join('');
}

export const MIN_PASSWORD_LENGTH = 8;
