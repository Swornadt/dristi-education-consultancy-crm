import { pool } from '../../config/db';

export async function convertLeadTransaction(leadId: number, body: any, userId: number) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const leadRes = await client.query(
      `SELECT * FROM leads WHERE id = $1 FOR UPDATE`,
      [leadId]
    );
    const lead = leadRes.rows[0];
    if (!lead) throw new Error('Lead not found');
    if (lead.status === 'lost') throw new Error('Cannot convert a lost lead');
    if (lead.status === 'converted') throw new Error('Lead is already converted');

    const studentRes = await client.query(
      `INSERT INTO students 
        (lead_id, full_name, email, phone, date_of_birth, nationality, address, guardian_name, guardian_phone, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11) 
       RETURNING id, lead_id, full_name, email, phone, 
                 to_char(date_of_birth, 'YYYY-MM-DD') as date_of_birth, 
                 nationality, preferred_courses, created_at`,
      [
        lead.id,
        lead.full_name,
        lead.email,
        lead.phone,
        body.dateOfBirth || null,
        body.nationality || null,
        body.address || null,
        body.guardianName || null,
        body.guardianPhone || null,
        lead.assigned_to,
        userId
      ]
    );
    const student = studentRes.rows[0];
    await client.query(
      `UPDATE leads SET status = 'converted', converted_at = now(), updated_at = now() WHERE id = $1`,
      [leadId]
    );
    const defaultDocsRes = await client.query(
      `SELECT id FROM document_types WHERE in_default_checklist = TRUE AND is_active = TRUE`
    );
    
    for (const docType of defaultDocsRes.rows) {
      const existingDocRes = await client.query(
        `SELECT file_id FROM lead_documents WHERE lead_id = $1 AND document_type_id = $2 LIMIT 1`,
        [leadId, docType.id]
      );
      
      const hasFile = existingDocRes.rows.length > 0;
      const fileId = hasFile ? existingDocRes.rows[0].file_id : null;
      const status = hasFile ? 'received' : 'pending';
      await client.query(
        `INSERT INTO student_documents (student_id, document_type_id, status, file_id)
         VALUES ($1, $2, $3, $4)`,
        [student.id, docType.id, status, fileId]
      );
    }

    await client.query('COMMIT');
    return student;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}