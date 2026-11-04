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

  // No response at all: server down, offline, or timed out. Not the same as "the server said no".
  get isConnectionProblem() {
    return this.status === 0;
  }
}
