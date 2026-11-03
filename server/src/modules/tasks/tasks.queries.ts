import { pool } from '../../config/db';

export async function listTasks(filters: any, scope: 'own' | 'all', userId: number) {
  let query = `
    SELECT t.*, 
           l.full_name as lead_name,
           s.full_name as student_name,
           u1.full_name as assigned_to_name,
           u2.full_name as created_by_name
    FROM tasks t
    LEFT JOIN leads l ON l.id = t.lead_id
    LEFT JOIN students s ON s.id = t.student_id
    LEFT JOIN users u1 ON u1.id = t.assigned_to
    LEFT JOIN users u2 ON u2.id = t.created_by
    WHERE 1=1
  `;
  const params: any[] = [];

  if (scope === 'own') {
    params.push(userId);
    query += ` AND (t.assigned_to = $${params.length} OR t.created_by = $${params.length})`;
  }

  if (filters.status) { params.push(filters.status); query += ` AND t.status = $${params.length}`; }
  if (filters.assignedTo) { params.push(filters.assignedTo); query += ` AND t.assigned_to = $${params.length}`; }
  if (filters.leadId) { params.push(filters.leadId); query += ` AND t.lead_id = $${params.length}`; }
  if (filters.studentId) { params.push(filters.studentId); query += ` AND t.student_id = $${params.length}`; }

  if (filters.view === 'today') {
    query += ` AND t.status = 'open' AND DATE(t.due_at) = CURRENT_DATE`;
  } else if (filters.view === 'overdue') {
    query += ` AND t.status = 'open' AND t.due_at < now()`;
  } else if (filters.view === 'upcoming') {
    query += ` AND t.status = 'open' AND t.due_at > now()`;
  }

  let sortField = 't.created_at';
  if (filters.sort === 'dueAt' || filters.sort === '-dueAt') sortField = 't.due_at';
  
  let sortOrder = filters.sort?.startsWith('-') ? 'DESC' : 'ASC';
  if (!filters.sort) sortOrder = 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getTaskById(id: number) {
  const { rows } = await pool.query(
    `SELECT t.*, l.full_name as lead_name, s.full_name as student_name, 
            u1.full_name as assigned_to_name, u2.full_name as created_by_name
     FROM tasks t
     LEFT JOIN leads l ON l.id = t.lead_id
     LEFT JOIN students s ON s.id = t.student_id
     LEFT JOIN users u1 ON u1.id = t.assigned_to
     LEFT JOIN users u2 ON u2.id = t.created_by
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createTask(data: any, createdBy: number) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, due_at, lead_id, student_id, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      data.title, data.description || null, data.dueAt,
      data.leadId || null, data.studentId || null,
      data.assignedTo || createdBy, createdBy
    ]
  );
  return rows[0].id;
}

export async function updateTask(id: number, data: any) {
  let query = `UPDATE tasks SET updated_at = now()`;
  const params: any[] = [];

  if (data.title !== undefined) { params.push(data.title); query += `, title = $${params.length}`; }
  if (data.description !== undefined) { params.push(data.description); query += `, description = $${params.length}`; }
  if (data.dueAt !== undefined) { params.push(data.dueAt); query += `, due_at = $${params.length}`; }
  if (data.assignedTo !== undefined) { params.push(data.assignedTo); query += `, assigned_to = $${params.length}`; }

  params.push(id);
  query += ` WHERE id = $${params.length}`;
  await pool.query(query, params);
}

export async function completeTask(id: number) {
  await pool.query(
    `UPDATE tasks SET status = 'done', completed_at = now(), updated_at = now() WHERE id = $1`,
    [id]
  );
}

export async function deleteTask(id: number) {
  await pool.query(`DELETE FROM tasks WHERE id = $1`, [id]);
}

export async function getLeadById(leadId: number) {
  const { rows } = await pool.query(`SELECT id, assigned_to, created_by FROM leads WHERE id = $1`, [leadId]);
  return rows[0] || null;
}

export async function getStudentById(studentId: number) {
  const { rows } = await pool.query(`SELECT id, assigned_to FROM students WHERE id = $1`, [studentId]);
  return rows[0] || null;
}

export async function getActiveUserById(id: number) {
  const { rows } = await pool.query(`SELECT id, is_active FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}