import api from './client';
import { unwrapList } from './helpers';
import { normalizePage } from './pagination';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/accounts';

const body = (promise) => promise.then((res) => res.data);

// GET /accounts/categories -> [{ id, name, kind: 'income' | 'expense', isActive }]
export const listAccountCategories = (params) =>
  USE_MOCK ? mock.listCategories(params) : api.get('/accounts/categories', { params }).then((r) => unwrapList(r.data));
export const createAccountCategory = (payload) =>
  USE_MOCK ? mock.createCategory(payload) : body(api.post('/accounts/categories', payload));
export const updateAccountCategory = (id, payload) =>
  USE_MOCK ? mock.updateCategory(id, payload) : body(api.patch(`/accounts/categories/${id}`, payload));

// GET /accounts/entries -> { data, meta }
// params: from, to, categoryId, kind, q, page, limit, sort (entryDate | amount)
// entry: { id, category: { id, name, kind }, entryDate, amount, description, payeeName, periodMonth, referenceNo, createdBy, createdAt }
export const listAccountEntries = (params) =>
  USE_MOCK ? mock.listEntries(params) : api.get('/accounts/entries', { params }).then((r) => normalizePage(r.data));
export const createAccountEntry = (payload) =>
  USE_MOCK ? mock.createEntry(payload) : body(api.post('/accounts/entries', payload));
export const updateAccountEntry = (id, payload) =>
  USE_MOCK ? mock.updateEntry(id, payload) : body(api.patch(`/accounts/entries/${id}`, payload));
export const deleteAccountEntry = (id) =>
  USE_MOCK ? mock.deleteEntry(id) : api.delete(`/accounts/entries/${id}`).then(() => undefined);

// GET /accounts/summary?month=YYYY-MM -> { month, totalIncome, totalExpense, net, byCategory: [{ categoryId, name, kind, total }] }
export const getAccountsSummary = (month) =>
  USE_MOCK ? mock.getSummary({ month }) : api.get('/accounts/summary', { params: { month } }).then((r) => r.data);
