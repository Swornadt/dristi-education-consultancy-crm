import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './students.subresources.queries';
import * as studentService from './students.service';
import fs from 'fs';

// EDUCATION
export async function createEducation(user: JwtPayload, studentId: number, data: any) {
  await studentService.getOne(user, studentId);
  const row = await queries.createEducation(studentId, data);
  return {
    id: Number(row.id),
    level: row.level,
    institution: row.institution,
    fieldOfStudy: row.field_of_study,
    startYear: row.start_year,
    endYear: row.end_year,
    grade: row.grade,
  };
}

export async function updateEducation(user: JwtPayload, studentId: number, eid: number, data: any) {
  await studentService.getOne(user, studentId);
  const row = await queries.updateEducation(studentId, eid, data);
  if (!row) throw new AppError('NOT_FOUND', 'Education record not found', 404);
  return {
    id: Number(row.id),
    level: row.level,
    institution: row.institution,
    fieldOfStudy: row.field_of_study,
    startYear: row.start_year,
    endYear: row.end_year,
    grade: row.grade,
  };
}

export async function deleteEducation(user: JwtPayload, studentId: number, eid: number) {
  await studentService.getOne(user, studentId);
  const deleted = await queries.deleteEducation(studentId, eid);
  if (!deleted) throw new AppError('NOT_FOUND', 'Education record not found', 404);
}
export async function createTestScore(user: JwtPayload, studentId: number, data: any) {
  await studentService.getOne(user, studentId);
  const row = await queries.createTestScore(studentId, data);
  return {
    id: Number(row.id),
    testName: row.test_name,
    overallScore: row.overall_score ? Number(row.overall_score) : null,
    sectionScores: row.section_scores,
    testDate: row.test_date_str || null,
  };
}

export async function updateTestScore(user: JwtPayload, studentId: number, sid: number, data: any) {
  await studentService.getOne(user, studentId);
  const row = await queries.updateTestScore(studentId, sid, data);
  if (!row) throw new AppError('NOT_FOUND', 'Test score not found', 404);
  return {
    id: Number(row.id),
    testName: row.test_name,
    overallScore: row.overall_score ? Number(row.overall_score) : null,
    sectionScores: row.section_scores,
    testDate: row.test_date_str || null,
  };
}

export async function deleteTestScore(user: JwtPayload, studentId: number, sid: number) {
  await studentService.getOne(user, studentId);
  const deleted = await queries.deleteTestScore(studentId, sid);
  if (!deleted) throw new AppError('NOT_FOUND', 'Test score not found', 404);
}
export async function getDocuments(user: JwtPayload, studentId: number) {
  await studentService.getOne(user, studentId);
  const checklist = await queries.getStudentChecklist(studentId);
  const leadAttachments = await queries.getStudentLeadAttachments(studentId);

  return {
    checklist: checklist.map(c => ({
      id: Number(c.id),
      documentType: { id: Number(c.document_type_id), name: c.doc_type_name },
      status: c.status,
      file: c.file_id ? { id: Number(c.file_id), originalName: c.original_name, mimeType: c.mime_type, sizeBytes: Number(c.size_bytes) } : null,
      remarks: c.remarks,
      verifiedBy: c.verified_by ? { id: Number(c.verified_by), fullName: c.verified_by_name } : null,
      verifiedAt: c.verified_at,
    })),
    leadAttachments: leadAttachments.map(a => ({
      id: Number(a.id),
      documentType: a.document_type_id ? { id: Number(a.document_type_id), name: a.doc_type_name } : null,
      note: a.note,
      file: { id: Number(a.file_id), originalName: a.original_name, mimeType: a.mime_type, sizeBytes: Number(a.size_bytes) },
      createdBy: { id: Number(a.created_by_id), fullName: a.created_by_name },
      createdAt: a.created_at,
    })),
  };
}

export async function addChecklistItem(user: JwtPayload, studentId: number, documentTypeId: number) {
  await studentService.getOne(user, studentId);
  try {
    const id = await queries.addChecklistItem(studentId, documentTypeId);
    return { id: Number(id), message: 'Checklist item added' };
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Document checklist item already exists', 409);
    }
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Document type not found', 400);
    }
    throw err;
  }
}

export async function updateChecklistItem(user: JwtPayload, studentId: number, itemId: number, data: any) {
  await studentService.getOne(user, studentId);
  const item = await queries.getChecklistItem(studentId, itemId);
  if (!item) throw new AppError('NOT_FOUND', 'Checklist item not found', 404);

  const row = await queries.updateChecklistItem(itemId, data, user.id);
  return {
    id: Number(row.id),
    status: row.status,
    remarks: row.remarks,
    verifiedBy: row.verified_by ? { id: Number(row.verified_by) } : null,
    verifiedAt: row.verified_at,
  };
}

export async function uploadChecklistFile(user: JwtPayload, studentId: number, itemId: number, file: Express.Multer.File) {
  await studentService.getOne(user, studentId);
  const item = await queries.getChecklistItem(studentId, itemId);
  if (!item) throw new AppError('NOT_FOUND', 'Checklist item not found', 404);
  if (item.file_id) {
    const oldFile = await queries.getFileById(item.file_id);
    if (oldFile) {
      if (fs.existsSync(oldFile.stored_path)) {
        try { fs.unlinkSync(oldFile.stored_path); } catch {}
      }
      await queries.deleteFileById(item.file_id);
    }
  }

  const fileId = await queries.createFileRecord(
    file.originalname, file.path, file.mimetype, file.size, user.id
  );
  await queries.attachFileToChecklistItem(itemId, fileId, item.status);

  return getDocuments(user, studentId);
}

export async function deleteChecklistItem(user: JwtPayload, studentId: number, itemId: number) {
  await studentService.getOne(user, studentId);
  const item = await queries.getChecklistItem(studentId, itemId);
  if (!item) throw new AppError('NOT_FOUND', 'Checklist item not found', 404);

  if (item.file_id) {
    const file = await queries.getFileById(item.file_id);
    if (file && fs.existsSync(file.stored_path)) {
      try { fs.unlinkSync(file.stored_path); } catch {}
    }
  }

  await queries.deleteChecklistItem(itemId);
}

export async function streamFile(user: JwtPayload, fileId: number) {
  const file = await queries.getFileById(fileId);
  if (!file) throw new AppError('NOT_FOUND', 'File not found', 404);

  if (user.role !== 'admin') {
    throw new AppError('FORBIDDEN', 'Only admins can stream files in this demo', 403);
  }

  return file;
}