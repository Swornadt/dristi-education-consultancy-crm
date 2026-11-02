import { pool } from '../../config/db';
import { Permission } from '../../types/auth';

export async function getEffectivePermissions(userId: number): Promise<Permission[]> {
  const rolePermsRes = await pool.query<Permission>(
    `SELECT p.module, p.action, rp.scope
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     JOIN users u ON u.role_id = rp.role_id
     WHERE u.id = $1`,
    [userId]
  );
  const base = rolePermsRes.rows;

  const overridesRes = await pool.query(
    `SELECT module, action, effect, scope FROM user_permissions WHERE user_id = $1`,
    [userId]
  );
  const overrides = overridesRes.rows;

  const effectiveMap = new Map<string, Permission>();

  for (const p of base) {
    effectiveMap.set(`${p.module}:${p.action}`, {
      module: p.module,
      action: p.action,
      scope: p.scope,
    });
  }

  for (const o of overrides) {
    const key = `${o.module}:${o.action}`;
    if (o.effect === 'deny') {
      effectiveMap.delete(key);
    } else if (o.effect === 'grant') {
      effectiveMap.set(key, {
        module: o.module,
        action: o.action,
        scope: o.scope,
      });
    }
  }

  const finalEffective = Array.from(effectiveMap.values());
  const hasView = new Set(
    finalEffective.filter(p => p.action === 'view').map(p => p.module)
  );

  return finalEffective.filter(p => p.action === 'view' || hasView.has(p.module));
}