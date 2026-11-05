import { pool } from '../../config/db';

// All queries accept a scope: 'all' (admin) sees every record;
// 'own' (counselor) sees only records assigned to or created by that user.

function ownFilter(alias: string, userId: number, params: unknown[]): string {
  params.push(userId);
  const n = params.length;
  return `AND (${alias}.assigned_to = $${n} OR ${alias}.created_by = $${n})`;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function leadsByStatus(scope: string, userId: number) {
  const params: unknown[] = [];
  const own = scope === 'own' ? ownFilter('l', userId, params) : '';
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM leads l WHERE 1=1 ${own}
     GROUP BY status ORDER BY status`,
    params,
  );
  return rows as { status: string; count: number }[];
}

export async function leadsBySource(scope: string, userId: number) {
  const params: unknown[] = [];
  const own = scope === 'own' ? ownFilter('l', userId, params) : '';
  const { rows } = await pool.query(
    `SELECT source, COUNT(*)::int AS count
     FROM leads l WHERE 1=1 ${own}
     GROUP BY source ORDER BY count DESC`,
    params,
  );
  return rows as { source: string; count: number }[];
}

export async function newLeadsThisMonth(monthStart: string, scope: string, userId: number) {
  const params: unknown[] = [monthStart];
  const own = scope === 'own' ? ownFilter('l', userId, params) : '';
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM leads l
     WHERE l.created_at >= $1::timestamptz
       AND l.created_at <  ($1::timestamptz + INTERVAL '1 month')
       ${own}`,
    params,
  );
  return Number(rows[0].count);
}

export async function conversionsThisMonth(monthStart: string, scope: string, userId: number) {
  const params: unknown[] = [monthStart];
  const own = scope === 'own' ? ownFilter('l', userId, params) : '';
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM leads l
     WHERE l.converted_at >= $1::timestamptz
       AND l.converted_at <  ($1::timestamptz + INTERVAL '1 month')
       ${own}`,
    params,
  );
  return Number(rows[0].count);
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function tasksDueToday(scope: string, userId: number) {
  const params: unknown[] = [];
  const own = scope === 'own' ? ownFilter('t', userId, params) : '';
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM tasks t
     WHERE t.status = 'open'
       AND DATE(t.due_at AT TIME ZONE 'UTC') = CURRENT_DATE
       ${own}`,
    params,
  );
  return Number(rows[0].count);
}

export async function tasksOverdue(scope: string, userId: number) {
  const params: unknown[] = [];
  const own = scope === 'own' ? ownFilter('t', userId, params) : '';
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM tasks t
     WHERE t.status = 'open'
       AND t.due_at < now()
       AND DATE(t.due_at AT TIME ZONE 'UTC') < CURRENT_DATE
       ${own}`,
    params,
  );
  return Number(rows[0].count);
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function applicationsByStatus(scope: string, userId: number) {
  const params: unknown[] = [];
  // Applications have created_by but not assigned_to; for 'own' scope we match
  // created_by or the linked student's assigned_to (the counselor).
  let own = '';
  if (scope === 'own') {
    params.push(userId);
    const n = params.length;
    own = `AND (a.created_by = $${n} OR s.assigned_to = $${n})`;
  }
  const { rows } = await pool.query(
    `SELECT a.status, COUNT(*)::int AS count
     FROM applications a
     JOIN students s ON s.id = a.student_id
     WHERE 1=1 ${own}
     GROUP BY a.status ORDER BY a.status`,
    params,
  );
  return rows as { status: string; count: number }[];
}

export async function upcomingDeadlines(scope: string, userId: number) {
  const params: unknown[] = [];
  let own = '';
  if (scope === 'own') {
    params.push(userId);
    const n = params.length;
    own = `AND (a.created_by = $${n} OR s.assigned_to = $${n})`;
  }
  const { rows } = await pool.query(
    `SELECT
       a.id          AS application_id,
       s.full_name   AS student_name,
       u.name        AS university,
       p.name        AS program,
       a.deadline
     FROM applications a
     JOIN students     s  ON s.id  = a.student_id
     JOIN program_intakes pi ON pi.id = a.program_intake_id
     JOIN programs     p  ON p.id  = pi.program_id
     JOIN universities u  ON u.id  = p.university_id
     WHERE a.status IN ('draft', 'submitted')
       AND a.deadline IS NOT NULL
       AND a.deadline >= CURRENT_DATE
       AND a.deadline <= CURRENT_DATE + INTERVAL '30 days'
       ${own}
     ORDER BY a.deadline ASC
     LIMIT 10`,
    params,
  );
  return rows;
}
