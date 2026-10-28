// Matches the error format in the API contract:
// { error: { code, message, details: [{ field, message }] } }
export class ApiError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
