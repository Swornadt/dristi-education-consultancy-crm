import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './leads.documents.queries';
import * as leadService from './leads.service';
import fs from 'fs';

export async function list(user: JwtPayload, leadId: number) {
  await leadService.getOne(user, leadId);
  const rows = await queries.listLeadDocuments(leadId);
  return rows.map(d => ({
    id: d.id,
    documentType: d.document_type_id ? { id: d.document_type_id, name: d.doc_type_name } : null,
    note: d.note,
    file: {
      id: d.file_id,
      originalName: d.original_name,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
    },
    createdBy: { id: d.created_by, fullName: d.created_by_name },
    createdAt: d.created_at,
  }));
}

export async function listDocumentTypes() {
  const rows = await queries.listDocumentTypes();
  
  return rows.map(d => ({
    id: d.id,
    name: d.name,
    inDefaultChecklist: d.inDefaultChecklist,
    isActive: d.isActive,
  }));
}

export async function upload(user: JwtPayload, leadId: number, file: Express.Multer.File, body: any) {
  await leadService.getOne(user, leadId);

  const fileId = await queries.createFileRecord(
    file.originalname,
    file.path,
    file.mimetype,
    file.size,
    user.id
  );

  const documentTypeId = body.documentTypeId ? Number(body.documentTypeId) : null;
  const note = body.note || null;

  const docId = await queries.createLeadDocument(leadId, documentTypeId, fileId, note, user.id);

  const result = await list(user, leadId);
  return result.find(d => d.id === docId);
}

export async function remove(user: JwtPayload, leadId: number, docId: number) {
  await leadService.getOne(user, leadId);
  const doc = await queries.getLeadDocumentById(docId);
  if (!doc || doc.lead_id !== leadId) {
    throw new AppError('NOT_FOUND', 'Document not found', 404);
  }
  
  await queries.deleteLeadDocument(docId);
  
  try { fs.unlinkSync(doc.stored_path); } catch {}
}