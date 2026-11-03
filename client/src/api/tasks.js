import api from './client';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/tasks';

const body = (promise) => promise.then((res) => res.data);

// GET /tasks -> { data, meta }
// params: view (today | overdue | upcoming | all), status, assignedTo, leadId, studentId, page, limit, sort
export const listTasks = (params) => (USE_MOCK ? mock.listTasks(params) : body(api.get('/tasks', { params })));

// { title, description?, dueAt, leadId?, studentId?, assignedTo? }
export const createTask = (payload) => (USE_MOCK ? mock.createTask(payload) : body(api.post('/tasks', payload)));

// { title?, description?, dueAt?, assignedTo? }
export const updateTask = (id, payload) =>
  USE_MOCK ? mock.updateTask(id, payload) : body(api.patch(`/tasks/${id}`, payload));

export const completeTask = (id) => (USE_MOCK ? mock.completeTask(id) : body(api.post(`/tasks/${id}/complete`)));

export const deleteTask = (id) => (USE_MOCK ? mock.deleteTask(id) : api.delete(`/tasks/${id}`).then(() => undefined));
