import { unwrapList } from './helpers';

// Accepts a plain array or { data, meta } and always returns { data, meta }.
export const normalizePage = (body) => {
  const data = unwrapList(body);
  return { data, meta: body?.meta ?? { total: data.length } };
};
