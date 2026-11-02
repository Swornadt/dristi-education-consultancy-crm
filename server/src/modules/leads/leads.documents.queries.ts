import { pool } from '../../config/db';

export async function listLeadDocuments(leadId: number) {
  const { rows } = await pool.query(
    `SELECT d.*, 
            dt.name as doc_type_name,
            f.original_name, f.mime_type, f.size_bytes,
            u.full_name as created_by_name
     FROM lead_documents d
     LEFT JOIN document_types dt ON dt.id = d.document_type_id
     JOIN files f ON f.id = d.file_id
     JOIN users u ON u.id = d.created_by
     WHERE d.lead_id = $1
     ORDER BY d.created_at DESC`,
    [leadId]
  );
  return rows;
}

export async function createFileRecord(
  originalName: string,
  storedPath: string,
  mimeType: string,
  sizeBytes: number,
  uploadedBy: number
) {
  const { rows } = await pool.query(
    `INSERT INTO files (original_name, stored_path, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [originalName, storedPath, mimeType, sizeBytes, uploadedBy]
  );
  return rows[0].id;
}

export async function createLeadDocument(
  leadId: number,
  documentTypeId: number | null,
  fileId: number,
  note: string | null,
  createdBy: number
) {
  const { rows } = await pool.query(
    `INSERT INTO lead_documents (lead_id, document_type_id, file_id, note, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [leadId, documentTypeId, fileId, note, createdBy]
  );
  return rows[0].id;
}

export async function getLeadDocumentById(docId: number) {
  const { rows } = await pool.query(
    `SELECT d.*, f.stored_path
     FROM lead_documents d JOIN files f ON f.id = d.file_id
     WHERE d.id = $1`,
    [docId]
  );
  return rows[0] || null;
}

export async function deleteLeadDocument(docId: number) {
  await pool.query(`DELETE FROM lead_documents WHERE id = $1`, [docId]);
}