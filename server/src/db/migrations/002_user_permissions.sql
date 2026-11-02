-- =====================================================================
-- Migration 002: per-user permission overrides
-- Run after schema.sql (001). Effective permissions for a user =
--   the role's role_permissions, then these overrides on top:
--     grant -> add the permission or replace its scope
--     deny  -> remove the permission
--   An action (create/update/delete) only counts when the same module's
--   "view" is also present after overrides are applied.
-- role_permissions itself is edited from the UI (PUT /roles/:id/permissions).
-- =====================================================================

BEGIN;

CREATE TYPE permission_effect AS ENUM ('grant', 'deny');

CREATE TABLE user_permissions (
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  effect        permission_effect NOT NULL,
  scope         perm_scope,                     -- required for grant, must be NULL for deny
  updated_by    BIGINT REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_id),
  CONSTRAINT user_permissions_scope_chk CHECK (
    (effect = 'grant' AND scope IS NOT NULL) OR (effect = 'deny' AND scope IS NULL)
  )
);
CREATE INDEX user_permissions_user_idx ON user_permissions (user_id);

-- Reference query: the effective permissions of one user ($1 = user id).
-- (Keep this in the server as a function; drop the "view" dependency filter into code if easier.)
--
-- WITH base AS (
--   SELECT p.id AS permission_id, p.module, p.action, rp.scope
--   FROM users u
--   JOIN role_permissions rp ON rp.role_id = u.role_id
--   JOIN permissions p ON p.id = rp.permission_id
--   WHERE u.id = $1
-- ),
-- merged AS (
--   SELECT b.module, b.action, b.scope
--   FROM base b
--   WHERE NOT EXISTS (SELECT 1 FROM user_permissions up WHERE up.user_id = $1 AND up.permission_id = b.permission_id)
--   UNION ALL
--   SELECT p.module, p.action, up.scope
--   FROM user_permissions up JOIN permissions p ON p.id = up.permission_id
--   WHERE up.user_id = $1 AND up.effect = 'grant'
-- )
-- SELECT m.module, m.action, m.scope
-- FROM merged m
-- WHERE m.action = 'view'
--    OR EXISTS (SELECT 1 FROM merged v WHERE v.module = m.module AND v.action = 'view');

COMMIT;
