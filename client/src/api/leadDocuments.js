import api from './client';
import { unwrapList } from './helpers';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/leadDocuments';

// GET /leads/:id/documents
// -> [{ id, documentType: { id, name } | null, note, file: { id, originalName, mimeType, sizeBytes }, createdBy, createdAt }]
export const listLeadDocuments = (leadId) =>
  USE_MOCK ? mock.listLeadDocuments(leadId) : api.get(`/leads/${leadId}/documents`).then((r) => unwrapList(r.data));

// POST /leads/:id/documents (multipart/form-data: file, documentTypeId?, note?)
export const uploadLeadDocument = (leadId, { file, documentTypeId, note }) => {
  if (USE_MOCK) return mock.uploadLeadDocument(leadId, { file, documentTypeId, note });
  const form = new FormData();
  form.append('file', file);
  if (documentTypeId) form.append('documentTypeId', documentTypeId);
  if (note) form.append('note', note);
  return api.post(`/leads/${leadId}/documents`, form).then((r) => r.data);
};

// DELETE /leads/:id/documents/:docId
export const deleteLeadDocument = (leadId, docId) =>
  USE_MOCK ? mock.deleteLeadDocument(leadId, docId) : api.delete(`/leads/${leadId}/documents/${docId}`).then(() => undefined);
