import api from './client';
import { unwrapList } from './helpers';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/leads';

const body = (promise) => promise.then((res) => res.data);

// GET /leads -> { data, meta: { page, limit, total, totalPages } }
export const listLeads = (params) => (USE_MOCK ? mock.listLeads(params) : body(api.get('/leads', { params })));

export const getLead = (id) => (USE_MOCK ? mock.getLead(id) : body(api.get(`/leads/${id}`)));

export const createLead = (payload) => (USE_MOCK ? mock.createLead(payload) : body(api.post('/leads', payload)));

export const updateLead = (id, payload) =>
  USE_MOCK ? mock.updateLead(id, payload) : body(api.patch(`/leads/${id}`, payload));

// { status, lostReason? }
export const updateLeadStatus = (id, payload) =>
  USE_MOCK ? mock.updateLeadStatus(id, payload) : body(api.patch(`/leads/${id}/status`, payload));

export const assignLead = (id, assignedTo) =>
  USE_MOCK ? mock.assignLead(id, assignedTo) : body(api.patch(`/leads/${id}/assign`, { assignedTo }));

// Returns the new student object
export const convertLead = (id, payload = {}) =>
  USE_MOCK ? mock.convertLead(id, payload) : body(api.post(`/leads/${id}/convert`, payload));

export const deleteLead = (id) =>
  USE_MOCK ? mock.deleteLead(id) : api.delete(`/leads/${id}`).then(() => undefined);

// Timeline, newest first
export const listActivities = (id) =>
  USE_MOCK ? mock.listActivities(id) : api.get(`/leads/${id}/activities`).then((r) => unwrapList(r.data));

export const addActivity = (id, payload) =>
  USE_MOCK ? mock.addActivity(id, payload) : body(api.post(`/leads/${id}/activities`, payload));
