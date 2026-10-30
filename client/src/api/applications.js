import api from './client';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/applications';

const body = (promise) => promise.then((res) => res.data);

// GET /applications -> { data, meta }
// params: studentId, status, countryId, universityId, programId, intakeId, assignedTo,
//         deadlineFrom, deadlineTo, page, limit, sort (deadline | createdAt)
export const listApplications = (params) =>
  USE_MOCK ? mock.listApplications(params) : body(api.get('/applications', { params }));

// Detail includes `history`
export const getApplication = (id) => (USE_MOCK ? mock.getApplication(id) : body(api.get(`/applications/${id}`)));

// { studentId, programIntakeId, deadline?, notes? }
export const createApplication = (payload) =>
  USE_MOCK ? mock.createApplication(payload) : body(api.post('/applications', payload));

// { deadline?, notes? }
export const updateApplication = (id, payload) =>
  USE_MOCK ? mock.updateApplication(id, payload) : body(api.patch(`/applications/${id}`, payload));

// { status, note? }
export const updateApplicationStatus = (id, payload) =>
  USE_MOCK ? mock.updateApplicationStatus(id, payload) : body(api.patch(`/applications/${id}/status`, payload));

export const deleteApplication = (id) =>
  USE_MOCK ? mock.deleteApplication(id) : api.delete(`/applications/${id}`).then(() => undefined);
