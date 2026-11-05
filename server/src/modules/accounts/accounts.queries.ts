import { pool } from '../../config/db';

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

export async function listCategories() {
  const { rows } = await pool.query(
    `SELECT id, name, kind, is_active, created_at
     FROM account_categories
     ORDER BY kind, name`,
  );
  return rows;
}

export async function getCategoryById(id: number) {
  const { rows } = await pool.query(
    `SELECT id, name, kind, is_active, created_at FROM account_categories WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function getCategoryByName(name: string) {
  const { rows } = await pool.query(
    `SELECT id FROM account_categories WHERE lower(name) = lower($1)`,
    [name],
  );
  return rows[0] || null;
}

export async function createCategory(name: string, kind: string) {
  const { rows } = await pool.query(
    `INSERT INTO account_categories (name, kind) VALUES ($1, $2) RETURNING id`,
    [name, kind],
  );
  return rows[0].id as number;
}

export async function updateCategory(id: number, data: { name?: string; isActive?: boolean }) {
  let query = `UPDATE account_categories SET updated_at = now()`;
  const params: unknown[] = [];

  if (data.name !== undefined)     { params.push(data.name);     query += `, name = $${params.length}`; }
  if (data.isActive !== undefined) { params.push(data.isActive); query += `, is_active = $${params.length}`; }

  params.push(id);
  query += ` WHERE id = $${params.length}`;
  await pool.query(query, params);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entries
// ─────────────────────────────────────────────────────────────────────────────

export interface EntryFilters {
  from?:       string;
  to?:         string;
  categoryId?: string | number;
  kind?:       string;
  q?:          string;
  sort?:       string;
  page?:       string | number;
  limit?:      string | number;
}

export async function listEntries(filters: EntryFilters) {
  const params: unknown[] = [];
  let where = `WHERE 1=1`;

  if (filters.from)       { params.push(filters.from);       where += ` AND ae.entry_date >= $${params.length}`; }
  if (filters.to)         { params.push(filters.to);         where += ` AND ae.entry_date <= $${params.length}`; }
  if (filters.categoryId) { params.push(filters.categoryId); where += ` AND ae.category_id = $${params.length}`; }
  if (filters.kind)       { params.push(filters.kind);       where += ` AND ac.kind = $${params.length}`; }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where += ` AND (ae.description ILIKE $${params.length} OR ae.payee_name ILIKE $${params.length})`;
  }

  const allowedSort: Record<string, string> = {
    entryDate:  'ae.entry_date',
    '-entryDate': 'ae.entry_date',
    amount:     'ae.amount',
    '-amount':  'ae.amount',
    createdAt:  'ae.created_at',
    '-createdAt': 'ae.created_at',
  };
  const sortField = allowedSort[filters.sort ?? ''] ?? 'ae.entry_date';
  const sortDir   = (filters.sort ?? '').startsWith('-') ? 'DESC' : 'DESC'; // default newest first

  const page  = Math.max(1, Number(filters.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const countQ = await pool.query(
    `SELECT COUNT(*) FROM account_entries ae
     JOIN account_categories ac ON ac.id = ae.category_id
     ${where}`,
    params,
  );
  const total = Number(countQ.rows[0].count);

  params.push(limit, offset);
  const { rows } = await pool.query(
    `SELECT ae.id, ae.entry_date, ae.amount, ae.description, ae.payee_name,
            ae.period_month, ae.reference_no, ae.created_at, ae.updated_at,
            ac.id AS category_id, ac.name AS category_name, ac.kind
     FROM account_entries ae
     JOIN account_categories ac ON ac.id = ae.category_id
     ${where}
     ORDER BY ${sortField} ${sortDir}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return { rows, total, page, limit };
}

export async function getEntryById(id: number) {
  const { rows } = await pool.query(
    `SELECT ae.id, ae.entry_date, ae.amount, ae.description, ae.payee_name,
            ae.period_month, ae.reference_no, ae.created_at, ae.updated_at,
            ac.id AS category_id, ac.name AS category_name, ac.kind
     FROM account_entries ae
     JOIN account_categories ac ON ac.id = ae.category_id
     WHERE ae.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function createEntry(data: {
  categoryId:  number;
  entryDate:   string;
  amount:      number;
  description?: string;
  payeeName?:   string;
  periodMonth?: string;
  referenceNo?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO account_entries
       (category_id, entry_date, amount, description, payee_name, period_month, reference_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      data.categoryId,
      data.entryDate,
      data.amount,
      data.description ?? null,
      data.payeeName   ?? null,
      data.periodMonth ?? null,
      data.referenceNo ?? null,
    ],
  );
  return rows[0].id as number;
}

export async function updateEntry(id: number, data: {
  categoryId?:  number;
  entryDate?:   string;
  amount?:      number;
  description?: string;
  payeeName?:   string;
  periodMonth?: string;
  referenceNo?: string;
}) {
  let query = `UPDATE account_entries SET updated_at = now()`;
  const params: unknown[] = [];

  if (data.categoryId  !== undefined) { params.push(data.categoryId);  query += `, category_id = $${params.length}`; }
  if (data.entryDate   !== undefined) { params.push(data.entryDate);   query += `, entry_date = $${params.length}`; }
  if (data.amount      !== undefined) { params.push(data.amount);      query += `, amount = $${params.length}`; }
  if (data.description !== undefined) { params.push(data.description); query += `, description = $${params.length}`; }
  if (data.payeeName   !== undefined) { params.push(data.payeeName);   query += `, payee_name = $${params.length}`; }
  if (data.periodMonth !== undefined) { params.push(data.periodMonth); query += `, period_month = $${params.length}`; }
  if (data.referenceNo !== undefined) { params.push(data.referenceNo); query += `, reference_no = $${params.length}`; }

  params.push(id);
  query += ` WHERE id = $${params.length}`;
  await pool.query(query, params);
}

export async function deleteEntry(id: number) {
  await pool.query(`DELETE FROM account_entries WHERE id = $1`, [id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

export async function getSummary(monthStart: string) {
  // All entries whose entry_date falls within the given month.
  const { rows } = await pool.query(
    `SELECT
       ac.id    AS category_id,
       ac.name  AS category_name,
       ac.kind,
       COALESCE(SUM(ae.amount), 0)::float AS total
     FROM account_categories ac
     LEFT JOIN account_entries ae
       ON ae.category_id = ac.id
       AND ae.entry_date >= $1::date
       AND ae.entry_date <  ($1::date + INTERVAL '1 month')
     WHERE ac.is_active = true
     GROUP BY ac.id, ac.name, ac.kind
     ORDER BY ac.kind, ac.name`,
    [monthStart],
  );
  return rows;
}
