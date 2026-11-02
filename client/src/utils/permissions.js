// Effective permissions = the role's permissions, then the person's overrides on top:
//   grant (with a scope) adds or replaces a permission; deny removes it.
// An action only counts if the same module's "view" is also present.
export function computeEffective(base, overrides = []) {
  const map = new Map(base.map((p) => [`${p.module}:${p.action}`, { module: p.module, action: p.action, scope: p.scope }]));
  overrides.forEach((o) => {
    const key = `${o.module}:${o.action}`;
    if (o.effect === 'deny') map.delete(key);
    else map.set(key, { module: o.module, action: o.action, scope: o.scope });
  });
  return [...map.values()].filter((p) => p.action === 'view' || map.has(`${p.module}:view`));
}

// 'none' | 'own' | 'all' for one module and action.
export const scopeIn = (permissions, module, action) =>
  permissions.find((p) => p.module === module && p.action === action)?.scope ?? 'none';
