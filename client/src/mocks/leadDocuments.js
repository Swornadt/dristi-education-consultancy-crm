// In-memory fake of the lead document endpoints. Documents stay linked to the lead; after the lead
// is converted they show up on the student's profile (see the students mock).
import { ApiError } from '../api/ApiError';
import { MAX_UPLOAD_MB } from '../config/studentOptions';
import { validateUpload } from '../utils/files';
import { getMockCurrentUser } from './auth';
import { USER_NAMES } from './data';
import { DOCUMENT_TYPES } from './documentTypes';
import { saveMockFile, seedMockFile } from './files';
import { getLead } from './leads';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

let nextId = 1;
const docs = [];

// [leadId, documentTypeId | null, file name, note, createdBy, daysAgo]
[
  [1, 1, 'Passport_scan.pdf', null, 3, 6],
  [1, 2, 'Transcripts_2024.pdf', 'Final semester pending', 3, 5],
  [2, 7, 'CV_draft.docx', null, 4, 4],
  [3, null, 'Counseling_notes.docx', 'Notes from the first meeting', 3, 8],
  [7, 1, 'Passport.pdf', null, 3, 20],
  [7, 2, 'Academic_Transcripts.pdf', null, 3, 19],
  [14, 7, 'Resume.pdf', null, 4, 18],
].forEach(([leadId, documentTypeId, name, note, createdBy, ago]) => {
  docs.push({ id: nextId++, leadId, documentTypeId, file: seedMockFile(name), note, createdBy, createdAt: daysAgo(ago) });
});

function access(action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  if (!user.permissions.some((p) => p.module === 'documents' && p.action === action)) {
    throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  }
  return user;
}

const typeRef = (id) => {
  const t = DOCUMENT_TYPES.find((x) => x.id === Number(id));
  return t ? { id: t.id, name: t.name } : null;
};

export const serializeLeadDocument = ({ leadId, documentTypeId, createdBy, ...rest }) =>
  copy({ ...rest, documentType: typeRef(documentTypeId), createdBy: { id: createdBy, fullName: USER_NAMES[createdBy] ?? `User ${createdBy}` } });

// Used by the students mock (no permission checks here; the caller has already checked the student).
export const getLeadAttachments = (leadId) => docs.filter((d) => d.leadId === Number(leadId));
export const getLeadAttachmentsOut = (leadId) =>
  getLeadAttachments(leadId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(serializeLeadDocument);

export async function listLeadDocuments(leadId) {
  access('view');
  const lead = await getLead(leadId); // also enforces the user's lead scope (404 if not visible)
  return getLeadAttachmentsOut(lead.id);
}

export async function uploadLeadDocument(leadId, { file, documentTypeId, note } = {}) {
  const user = access('create');
  const lead = await getLead(leadId);
  await delay(300);
  if (!file) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'file', message: 'Choose a file.' }]);
  const problem = validateUpload(file);
  if (problem) {
    const tooLarge = file.size > MAX_UPLOAD_MB * 1024 * 1024;
    throw new ApiError(tooLarge ? 413 : 415, tooLarge ? 'FILE_TOO_LARGE' : 'UNSUPPORTED_FILE_TYPE', problem);
  }
  if (documentTypeId && !typeRef(documentTypeId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'documentTypeId', message: 'Choose a valid document type.' }]);
  }
  const doc = {
    id: nextId++, leadId: lead.id, documentTypeId: documentTypeId ? Number(documentTypeId) : null,
    file: saveMockFile(file), note: note?.trim() || null, createdBy: user.id, createdAt: new Date().toISOString(),
  };
  docs.push(doc);
  return serializeLeadDocument(doc);
}

export async function deleteLeadDocument(leadId, docId) {
  access('delete');
  const lead = await getLead(leadId);
  const doc = docs.find((d) => d.id === Number(docId) && d.leadId === lead.id);
  if (!doc) throw new ApiError(404, 'NOT_FOUND', 'Document not found.');
  docs.splice(docs.indexOf(doc), 1);
}
