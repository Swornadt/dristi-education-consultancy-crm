BEGIN;

CREATE TABLE
  user_permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete')),
    effect TEXT NOT NULL CHECK (effect IN ('grant', 'deny')),
    scope perm_scope,
    CONSTRAINT user_permissions_unique UNIQUE (user_id, module, action),
    CONSTRAINT user_permissions_scope_chk CHECK (
      (
        effect = 'grant'
        AND scope IS NOT NULL
      )
      OR (
        effect = 'deny'
        AND scope IS NULL
      )
    )
  );

COMMIT;