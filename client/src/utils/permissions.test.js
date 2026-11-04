import { describe, expect, it } from 'vitest';
import { computeEffective, scopeIn } from './permissions';

const base = [
  { module: 'leads', action: 'view', scope: 'own' },
  { module: 'leads', action: 'update', scope: 'own' },
  { module: 'tasks', action: 'view', scope: 'all' },
];
const has = (list, module, action) => list.some((p) => p.module === module && p.action === action);

describe('computeEffective', () => {
  it('returns the role permissions when there are no overrides', () => {
    expect(computeEffective(base)).toHaveLength(3);
  });

  it('a grant adds a permission with the given scope', () => {
    const result = computeEffective(base, [{ module: 'tasks', action: 'create', effect: 'grant', scope: 'own' }]);
    expect(scopeIn(result, 'tasks', 'create')).toBe('own');
  });

  it('a grant replaces the scope of an existing permission', () => {
    const result = computeEffective(base, [{ module: 'leads', action: 'view', effect: 'grant', scope: 'all' }]);
    expect(scopeIn(result, 'leads', 'view')).toBe('all');
  });

  it('a deny removes a permission', () => {
    const result = computeEffective(base, [{ module: 'leads', action: 'update', effect: 'deny' }]);
    expect(has(result, 'leads', 'update')).toBe(false);
    expect(has(result, 'leads', 'view')).toBe(true);
  });

  it('denying view drops every other action in that module', () => {
    const result = computeEffective(base, [{ module: 'leads', action: 'view', effect: 'deny' }]);
    expect(has(result, 'leads', 'update')).toBe(false);
    expect(has(result, 'tasks', 'view')).toBe(true);
  });

  it('a granted action without view in its module does not count', () => {
    const result = computeEffective(base, [{ module: 'accounts', action: 'create', effect: 'grant', scope: 'all' }]);
    expect(has(result, 'accounts', 'create')).toBe(false);
  });

  it('does not mutate its inputs', () => {
    const snapshot = JSON.stringify(base);
    computeEffective(base, [{ module: 'leads', action: 'view', effect: 'deny' }]);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});

describe('scopeIn', () => {
  it("returns 'none' when the permission is missing", () => {
    expect(scopeIn(base, 'accounts', 'view')).toBe('none');
  });
  it('returns the scope when present', () => {
    expect(scopeIn(base, 'tasks', 'view')).toBe('all');
  });
});
