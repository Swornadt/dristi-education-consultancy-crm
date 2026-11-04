import { beforeEach, describe, expect, it, vi } from 'vitest';

// The axios instance reads the token from localStorage, which does not exist in the node test environment.
vi.stubGlobal('localStorage', { getItem: () => 'test-token', setItem: () => {}, removeItem: () => {} });

const { default: api, setUnauthorizedHandler } = await import('./client');

// Makes the next request fail the way axios would, without any network.
function failWith({ status, data, code }) {
  api.defaults.adapter = (config) => {
    const error = new Error('request failed');
    error.isAxiosError = true;
    error.config = config;
    error.code = code;
    if (status) error.response = { status, data, config };
    return Promise.reject(error);
  };
}
const catchError = (url = '/things') => api.get(url).then(() => null, (e) => e);

let unauthorized;
beforeEach(() => {
  unauthorized = vi.fn();
  setUnauthorizedHandler(unauthorized);
});

describe('error normalising', () => {
  it('uses the contract error body', async () => {
    failWith({ status: 409, data: { error: { code: 'CONFLICT', message: 'Already exists' } } });
    const err = await catchError();
    expect(err).toMatchObject({ name: 'ApiError', status: 409, code: 'CONFLICT', message: 'Already exists' });
  });

  it("strips the 'body.' prefix the server puts on validation fields", async () => {
    failWith({
      status: 400,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: [
            { field: 'body.fullName', message: 'Required' },
            { field: 'query.page', message: 'Invalid' },
            { field: 'body.desiredIntake.year', message: 'Too low' },
            { field: 'email', message: 'already bare' },
          ],
        },
      },
    });
    const err = await catchError();
    expect(err.details.map((d) => d.field)).toEqual(['fullName', 'page', 'desiredIntake.year', 'email']);
  });

  it('defaults details to an empty array', async () => {
    failWith({ status: 500, data: { error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } } });
    expect((await catchError()).details).toEqual([]);
  });

  it('flags a timeout as a connection problem', async () => {
    failWith({ code: 'ECONNABORTED' });
    const err = await catchError();
    expect(err).toMatchObject({ status: 0, code: 'TIMEOUT', isConnectionProblem: true });
    expect(err.message).toMatch(/too long/);
  });

  it('flags an unreachable server as a connection problem', async () => {
    failWith({ code: 'ERR_NETWORK' });
    expect(await catchError()).toMatchObject({ status: 0, code: 'NETWORK_ERROR', isConnectionProblem: true });
  });

  it('gives a friendly message for a proxy error page (HTML body)', async () => {
    failWith({ status: 502, data: '<html>Bad Gateway</html>' });
    const err = await catchError();
    expect(err.status).toBe(502);
    expect(err.message).toMatch(/unavailable/);
    expect(err.isConnectionProblem).toBe(false);
  });

  it('falls back to a permission message for an empty 403', async () => {
    failWith({ status: 403 });
    expect((await catchError()).message).toMatch(/permission/);
  });

  it('reads the error out of a Blob body (file downloads)', async () => {
    const body = new Blob([JSON.stringify({ error: { code: 'NOT_FOUND', message: 'File not found' } })]);
    failWith({ status: 404, data: body });
    expect(await catchError('/files/9')).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'File not found' });
  });

  it('copes with a Blob that is not JSON', async () => {
    failWith({ status: 500, data: new Blob(['not json']) });
    expect((await catchError('/files/9')).status).toBe(500);
  });
});

describe('401 handling', () => {
  it('signs the user out on a 401', async () => {
    failWith({ status: 401, data: { error: { code: 'UNAUTHENTICATED', message: 'Token has been revoked' } } });
    await catchError();
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not sign out when the login call itself returns 401 (wrong password)', async () => {
    failWith({ status: 401, data: { error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password' } } });
    const err = await catchError('/auth/login');
    expect(unauthorized).not.toHaveBeenCalled();
    expect(err.message).toBe('Invalid email or password');
  });

  it('does not sign out on other statuses', async () => {
    failWith({ status: 403, data: { error: { code: 'FORBIDDEN', message: 'No' } } });
    await catchError();
    expect(unauthorized).not.toHaveBeenCalled();
  });
});
