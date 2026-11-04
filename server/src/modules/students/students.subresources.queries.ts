import { pool } from '../../config/db';

export async function createEducation(studentId: number, data: any) {
  const { rows } = await pool.query(
    `INSERT INTO student_education (student_id, level, institution, field_of_study, start_year, end_year, grade)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [studentId, data.level, data.institution, data.fieldOfStudy || null, data.startYear || null, data.endYear || null, data.grade || null]
  );
  return rows[0];
}

export async function updateEducation(studentId: number, eid: number, data: any) {
  let query = `UPDATE student_education SET`;
  const params: any[] = [];
  const fields = [
    { key: 'level', db: 'level' },
    { key: 'institution', db: 'institution' },
    { key: 'fieldOfStudy', db: 'field_of_study' },
    { key: 'startYear', db: 'start_year' },
    { key: 'endYear', db: 'end_year' },
    { key: 'grade', db: 'grade' },
  ];
  let first = true;
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `${first ? ' ' : ', '}${f.db} = $${params.length + 1}`;
      params.push(data[f.key]);
      first = false;
    }
  }
  params.push(eid, studentId);
  query += ` WHERE id = $${params.length - 1} AND student_id = $${params.length} RETURNING *`;
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
}

export async function deleteEducation(studentId: number, eid: number) {
  const { rowCount } = await pool.query(
    `DELETE FROM student_education WHERE id = $1 AND student_id = $2`,
    [eid, studentId]
  );
  return (rowCount || 0) > 0;
}
export async function createTestScore(studentId: number, data: any) {
  const { rows } = await pool.query(
    `INSERT INTO student_test_scores (student_id, test_name, overall_score, section_scores, test_date)
     VALUES ($1, $2, $3, $4, $5::date) 
     RETURNING id, test_name, overall_score, section_scores, 
               to_char(test_date, 'YYYY-MM-DD') as test_date_str`,
    [studentId, data.testName, data.overallScore || null, data.sectionScores ? JSON.stringify(data.sectionScores) : null, data.testDate || null]
  );
  return rows[0];
}

export async function updateTestScore(studentId: number, sid: number, data: any) {
  let query = `UPDATE student_test_scores SET`;
  const params: any[] = [];
  const fields = [
    { key: 'testName', db: 'test_name' },
    { key: 'overallScore', db: 'overall_score' },
    { key: 'testDate', db: 'test_date', cast: '::date' },
  ];
  let first = true;
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `${first ? ' ' : ', '}${f.db} = $${params.length + 1}${f.cast || ''}`;
      params.push(data[f.key]);
      first = false;
    }
  }
  if (data.sectionScores !== undefined) {
    query += `${first ? ' ' : ', '}section_scores = $${params.length + 1}`;
    params.push(JSON.stringify(data.sectionScores));
    first = false;
  }
  params.push(sid, studentId);
  query += ` WHERE id = $${params.length - 1} AND student_id = $${params.length} 
             RETURNING id, test_name, overall_score, section_scores, 
                       to_char(test_date, 'YYYY-MM-DD') as test_date_str`;
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
}

export async function deleteTestScore(studentId: number, sid: number) {
  const { rowCount } = await pool.query(
    `DELETE FROM student_test_scores WHERE id = $1 AND student_id = $2`,
    [sid, studentId]
  );
  return (rowCount || 0) > 0;
}
export async function getStudentChecklist(studentId: number) {
  const { rows } = await pool.query(
    `SELECT sd.*, dt.name as doc_type_name,
            f.id as file_id, f.original_name, f.mime_type, f.size_bytes,
            u.full_name as verified_by_name
     FROM student_documents sd
     JOIN document_types dt ON dt.id = sd.document_type_id
     LEFT JOIN files f ON f.id = sd.file_id
     LEFT JOIN users u ON u.id = sd.verified_by
     WHERE sd.student_id = $1
     ORDER BY sd.id ASC`,
    [studentId]
  );
  return rows;
}

export async function getStudentLeadAttachments(studentId: number) {
  const { rows } = await pool.query(
    `SELECT ld.id, ld.note, ld.created_at,
            dt.id as document_type_id, dt.name as doc_type_name,
            f.id as file_id, f.original_name, f.mime_type, f.size_bytes,
            u.full_name as created_by_name, u.id as created_by_id
     FROM lead_documents ld
     JOIN students s ON s.lead_id = ld.lead_id
     LEFT JOIN document_types dt ON dt.id = ld.document_type_id
     JOIN files f ON f.id = ld.file_id
     JOIN users u ON u.id = ld.created_by
     WHERE s.id = $1
     ORDER BY ld.created_at DESC`,
    [studentId]
  );
  return rows;
}

export async function addChecklistItem(studentId: number, documentTypeId: number) {
  const { rows } = await pool.query(
    `INSERT INTO student_documents (student_id, document_type_id, status)
     VALUES ($1, $2, 'pending') RETURNING id`,
    [studentId, documentTypeId]
  );
  return rows[0].id;
}

export async function getChecklistItem(studentId: number, itemId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM student_documents WHERE id = $1 AND student_id = $2`,
    [itemId, studentId]
  );
  return rows[0] || null;
}

export async function updateChecklistItem(itemId: number, data: any, userId: number) {
  let query = `UPDATE student_documents SET updated_at = now()`;
  const params: any[] = [];

  if (data.status !== undefined) {
    params.push(data.status);
    query += `, status = $${params.length}`;
    if (data.status === 'verified') {
      params.push(userId);
      query += `, verified_by = $${params.length}`;
      query += `, verified_at = now()`;
    }
  }
  if (data.remarks !== undefined) { params.push(data.remarks); query += `, remarks = $${params.length}`; }

  params.push(itemId);
  query += ` WHERE id = $${params.length} RETURNING *`;
  const { rows } = await pool.query(query, params);
  return rows[0];
}

export async function attachFileToChecklistItem(itemId: number, fileId: number, currentStatus: string) {
  const newStatus = currentStatus === 'pending' ? 'received' : currentStatus;
  await pool.query(
    `UPDATE student_documents SET file_id = $1, status = $2, updated_at = now() WHERE id = $3`,
    [fileId, newStatus, itemId]
  );
}

export async function deleteChecklistItem(itemId: number) {
  await pool.query(`DELETE FROM student_documents WHERE id = $1`, [itemId]);
}

export async function getFileById(fileId: number) {
  const { rows } = await pool.query(
    `SELECT * FROM files WHERE id = $1`,
    [fileId]
  );
  return rows[0] || null;
}

export async function createFileRecord(
  originalName: string, storedPath: string, mimeType: string, sizeBytes: number, uploadedBy: number
) {
  const { rows } = await pool.query(
    `INSERT INTO files (original_name, stored_path, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [originalName, storedPath, mimeType, sizeBytes, uploadedBy]
  );
  return rows[0].id;
}

export async function deleteFileById(fileId: number) {
  await pool.query(`DELETE FROM files WHERE id = $1`, [fileId]);
}