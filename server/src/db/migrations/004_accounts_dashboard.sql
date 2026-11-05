BEGIN;

-- accounts.queries.ts writes updated_at on categories; the schema table has none.
ALTER TABLE account_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER account_categories_updated
  BEFORE UPDATE ON account_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
