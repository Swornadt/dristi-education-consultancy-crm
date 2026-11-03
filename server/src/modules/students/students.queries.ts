import { pool } from '../../config/db';

export async function listStudents(filters: any, scope: 'own' | 'all', userId: number) {
  let query = `
    SELECT s.*, 
           u.full_name as assigned_to_name,
           to_char(s.date_of_birth, 'YYYY-MM-DD') as date_of_birth_str
    FROM students s
    LEFT JOIN users u ON u.id = s.assigned_to
    WHERE 1=1
  `;
  const params: any[] = [];

  if (scope === 'own') {
    params.push(userId);
    query += ` AND (s.assigned_to = $${params.length} OR s.created_by = $${params.length})`;
  }

  if (filters.assignedTo) { params.push(filters.assignedTo); query += ` AND s.assigned_to = $${params.length}`; }
  
  if (filters.preferredCountryId) {
    params.push(filters.preferredCountryId);
    query += ` AND s.id IN (SELECT student_id FROM student_preferred_countries WHERE country_id = $${params.length})`;
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    query += ` AND (s.full_name ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.phone ILIKE $${params.length})`;
  }

  let sortField = 's.created_at';
  if (filters.sort === 'fullName' || filters.sort === '-fullName') sortField = 's.full_name';
  
  let sortOrder = filters.sort?.startsWith('-') ? 'DESC' : 'ASC';
  if (!filters.sort) sortOrder = 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getStudentById(id: number) {
  const { rows } = await pool.query(
    `SELECT s.*, 
            u.full_name as assigned_to_name,
            to_char(s.date_of_birth, 'YYYY-MM-DD') as date_of_birth_str
     FROM students s
     LEFT JOIN users u ON u.id = s.assigned_to
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getPreferredCountries(studentId: number) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name
     FROM student_preferred_countries spc
     JOIN countries c ON c.id = spc.country_id
     WHERE spc.student_id = $1`,
    [studentId]
  );
  return rows;
}

export async function getEducation(studentId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM student_education WHERE student_id = $1 ORDER BY id ASC`,
    [studentId]
  );
  return rows;
}

export async function getTestScores(studentId: number) {
  const { rows } = await pool.query(
    `SELECT id, test_name, overall_score, section_scores, to_char(test_date, 'YYYY-MM-DD') as test_date_str 
     FROM student_test_scores WHERE student_id = $1 ORDER BY id ASC`,
    [studentId]
  );
  return rows;
}

export async function updateStudent(id: number, data: any) {
  let query = `UPDATE students SET updated_at = now()`;
  const params: any[] = [];

  const fields = [
    { key: 'fullName', db: 'full_name' },
    { key: 'email', db: 'email' },
    { key: 'phone', db: 'phone' },
    { key: 'dateOfBirth', db: 'date_of_birth' },
    { key: 'gender', db: 'gender' },
    { key: 'nationality', db: 'nationality' },
    { key: 'address', db: 'address' },
    { key: 'guardianName', db: 'guardian_name' },
    { key: 'guardianPhone', db: 'guardian_phone' },
    { key: 'preferredCourses', db: 'preferred_courses' },
    { key: 'notes', db: 'notes' },
    { key: 'assignedTo', db: 'assigned_to' },
  ];

  for (const field of fields) {
    if (data[field.key] !== undefined) {
      params.push(data[field.key]);
      query += `, ${field.db} = $${params.length}`;
    }
  }

  params.push(id);
  query += ` WHERE id = $${params.length}`;
  await pool.query(query, params);
}

export async function replacePreferredCountries(studentId: number, countryIds: number[]) {
  const uniqueCountryIds = [...new Set(countryIds)];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM student_preferred_countries WHERE student_id = $1`, [studentId]);
    for (const countryId of uniqueCountryIds) {
      await client.query(
        `INSERT INTO student_preferred_countries (student_id, country_id) VALUES ($1, $2)`,
        [studentId, countryId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getActiveUserById(id: number) {
  const { rows } = await pool.query(`SELECT id, is_active FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}