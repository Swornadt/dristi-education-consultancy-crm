// List endpoints may return a plain array or { data, meta }. Accept both.
export const unwrapList = (body) => (Array.isArray(body) ? body : body?.data ?? []);
