import { pool } from '../../config/db';

export async function listApplications(filters: any, scope: 'own' | 'all', userId: number) {
  let query = `
    SELECT a.*, 
           to_char(a.deadline, 'YYYY-MM-DD') as deadline_str,
           s.full_name as student_name,
           pi.term, pi.year,
           p.id as program_id, p.name as program_name, p.level as program_level,
           u.id as university_id, u.name as university_name,
           c.id as country_id, c.name as country_name
    FROM applications a
    JOIN students s ON s.id = a.student_id
    JOIN program_intakes pi ON pi.id = a.program_intake_id
    JOIN programs p ON p.id = pi.program_id
    JOIN universities u ON u.id = p.university_id
    JOIN countries c ON c.id = u.country_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (scope === 'own') {
    params.push(userId);
    query += ` AND (s.assigned_to = $${params.length} OR s.created_by = $${params.length})`;
  }

  if (filters.studentId) { params.push(filters.studentId); query += ` AND a.student_id = $${params.length}`; }
  if (filters.status) { params.push(filters.status); query += ` AND a.status = $${params.length}`; }
  if (filters.countryId) { params.push(filters.countryId); query += ` AND c.id = $${params.length}`; }
  if (filters.universityId) { params.push(filters.universityId); query += ` AND u.id = $${params.length}`; }
  if (filters.programId) { params.push(filters.programId); query += ` AND p.id = $${params.length}`; }
  if (filters.intakeId) { params.push(filters.intakeId); query += ` AND pi.id = $${params.length}`; }
  if (filters.assignedTo) { params.push(filters.assignedTo); query += ` AND s.assigned_to = $${params.length}`; }
  if (filters.deadlineFrom) { params.push(filters.deadlineFrom); query += ` AND a.deadline >= $${params.length}`; }
  if (filters.deadlineTo) { params.push(filters.deadlineTo); query += ` AND a.deadline <= $${params.length}`; }

  let sortField = 'a.created_at';
  if (filters.sort === 'deadline' || filters.sort === '-deadline') sortField = 'a.deadline';
  let sortOrder = filters.sort?.startsWith('-') ? 'DESC' : 'ASC';
  if (!filters.sort) sortOrder = 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getApplicationById(id: number) {
  const { rows } = await pool.query(
    `SELECT a.*, 
            to_char(a.deadline, 'YYYY-MM-DD') as deadline_str,
            s.full_name as student_name,
            pi.term, pi.year,
            p.id as program_id, p.name as program_name, p.level as program_level,
            u.id as university_id, u.name as university_name,
            c.id as country_id, c.name as country_name
     FROM applications a
     JOIN students s ON s.id = a.student_id
     JOIN program_intakes pi ON pi.id = a.program_intake_id
     JOIN programs p ON p.id = pi.program_id
     JOIN universities u ON u.id = p.university_id
     JOIN countries c ON c.id = u.country_id
     WHERE a.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getApplicationHistory(id: number) {
  const { rows } = await pool.query(
    `SELECT h.*, u.full_name as changed_by_name
     FROM application_status_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.application_id = $1
     ORDER BY h.changed_at ASC`,
    [id]
  );
  return rows;
}

export async function checkDuplicate(studentId: number, intakeId: number) {
  const { rows } = await pool.query(
    `SELECT id FROM applications WHERE student_id = $1 AND program_intake_id = $2`,
    [studentId, intakeId]
  );
  return rows[0] || null;
}

export async function getIntakeDeadline(intakeId: number) {
  const { rows } = await pool.query(
    `SELECT to_char(application_deadline, 'YYYY-MM-DD') as application_deadline_str FROM program_intakes WHERE id = $1`,
    [intakeId]
  );
  return rows[0] || null;
}

export async function getStudentById(id: number) {
  const { rows } = await pool.query(`SELECT id, assigned_to, created_by FROM students WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function createApplication(data: any, createdBy: number) {
  const { rows } = await pool.query(
    `INSERT INTO applications (student_id, program_intake_id, deadline, notes, created_by)
     VALUES ($1, $2, $3::date, $4, $5) RETURNING id`,
    [data.studentId, data.programIntakeId, data.deadline || null, data.notes || null, createdBy]
  );
  return rows[0].id;
}

export async function insertInitialHistory(appId: number, userId: number) {
  await pool.query(
    `INSERT INTO application_status_history (application_id, from_status, to_status, note, changed_by)
     VALUES ($1, NULL, 'draft', NULL, $2)`,
    [appId, userId]
  );
}

export async function updateApplication(id: number, data: any) {
  let query = `UPDATE applications SET updated_at = now()`;
  const params: any[] = [];

  if (data.deadline !== undefined) { params.push(data.deadline); query += `, deadline = $${params.length}::date`; }
  if (data.notes !== undefined) { params.push(data.notes); query += `, notes = $${params.length}`; }

  params.push(id);
  query += ` WHERE id = $${params.length}`;
  await pool.query(query, params);
}

export async function updateApplicationStatus(id: number, status: string, fromStatus: string, note: string | null, userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const lockRes = await client.query(
      `SELECT status FROM applications WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const currentStatus = lockRes.rows[0]?.status;
    
    if (currentStatus !== fromStatus) {
      await client.query('ROLLBACK');
      throw new Error('CONCURRENT_MODIFICATION');
    }
    
    let updateQuery = `UPDATE applications SET status = $1, updated_at = now()`;
    const params: any[] = [status];
    
    if (status === 'submitted') {
      updateQuery += `, submitted_at = now()`;
    }
    
    params.push(id);
    updateQuery += ` WHERE id = $${params.length}`;
    await client.query(updateQuery, params);

    await client.query(
      `INSERT INTO application_status_history (application_id, from_status, to_status, note, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, fromStatus, status, note, userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteApplication(id: number) {
  await pool.query(`DELETE FROM applications WHERE id = $1`, [id]);
}