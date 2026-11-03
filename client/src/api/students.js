import api from './client';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/students';

const body = (promise) => promise.then((res) => res.data);
const nothing = () => undefined;

// GET /students -> { data, meta }. params: q, assignedTo, preferredCountryId, page, limit, sort
export const listStudents = (params) => (USE_MOCK ? mock.listStudents(params) : body(api.get('/students', { params })));

// Full profile, including education and testScores
export const getStudent = (id) => (USE_MOCK ? mock.getStudent(id) : body(api.get(`/students/${id}`)));

export const updateStudent = (id, payload) =>
  USE_MOCK ? mock.updateStudent(id, payload) : body(api.patch(`/students/${id}`, payload));

// PUT /students/:id/preferred-countries { countryIds }
export const setPreferredCountries = (id, countryIds) =>
  USE_MOCK
    ? mock.setPreferredCountries(id, countryIds)
    : api.put(`/students/${id}/preferred-countries`, { countryIds }).then(nothing);

// ----- education -----
export const addEducation = (id, payload) =>
  USE_MOCK ? mock.addEducation(id, payload) : body(api.post(`/students/${id}/education`, payload));
export const updateEducation = (id, eid, payload) =>
  USE_MOCK ? mock.updateEducation(id, eid, payload) : body(api.patch(`/students/${id}/education/${eid}`, payload));
export const deleteEducation = (id, eid) =>
  USE_MOCK ? mock.deleteEducation(id, eid) : api.delete(`/students/${id}/education/${eid}`).then(nothing);

// ----- test scores -----
export const addTestScore = (id, payload) =>
  USE_MOCK ? mock.addTestScore(id, payload) : body(api.post(`/students/${id}/test-scores`, payload));
export const updateTestScore = (id, sid, payload) =>
  USE_MOCK ? mock.updateTestScore(id, sid, payload) : body(api.patch(`/students/${id}/test-scores/${sid}`, payload));
export const deleteTestScore = (id, sid) =>
  USE_MOCK ? mock.deleteTestScore(id, sid) : api.delete(`/students/${id}/test-scores/${sid}`).then(nothing);

// ----- document checklist -----
// -> { checklist: [...], leadAttachments: [...] }
export const listStudentDocuments = (id) =>
  USE_MOCK ? mock.listStudentDocuments(id) : body(api.get(`/students/${id}/documents`));

export const addChecklistItem = (id, documentTypeId) =>
  USE_MOCK ? mock.addChecklistItem(id, documentTypeId) : body(api.post(`/students/${id}/documents`, { documentTypeId }));

// { status?, remarks? }
export const updateChecklistItem = (id, itemId, payload) =>
  USE_MOCK
    ? mock.updateChecklistItem(id, itemId, payload)
    : body(api.patch(`/students/${id}/documents/${itemId}`, payload));

// multipart/form-data with a single `file` field
export const uploadChecklistFile = (id, itemId, file) => {
  if (USE_MOCK) return mock.uploadChecklistFile(id, itemId, file);
  const form = new FormData();
  form.append('file', file);
  return body(api.post(`/students/${id}/documents/${itemId}/file`, form));
};

export const deleteChecklistItem = (id, itemId) =>
  USE_MOCK ? mock.deleteChecklistItem(id, itemId) : api.delete(`/students/${id}/documents/${itemId}`).then(nothing);
