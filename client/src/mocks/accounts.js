// In-memory fake of the accounts endpoints (office bookkeeping, admin only).
// Seeded with a few months of rent, salaries, utilities and so on, relative to today.
import { ApiError } from '../api/ApiError';
import { getMockCurrentUser } from './auth';
import { USER_NAMES } from './data';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const validation = (details) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ---------- seed data ----------
const categories = [
  { id: 1, name: 'Office Rent', kind: 'expense', isActive: true },
  { id: 2, name: 'Staff Salary', kind: 'expense', isActive: true },
  { id: 3, name: 'Utilities', kind: 'expense', isActive: true },
  { id: 4, name: 'Marketing', kind: 'expense', isActive: true },
  { id: 5, name: 'Office Supplies', kind: 'expense', isActive: true },
  { id: 6, name: 'Other Expense', kind: 'expense', isActive: true },
  { id: 7, name: 'Other Income', kind: 'income', isActive: true },
];
let nextCategoryId = 8;
let nextEntryId = 1;
const entries = [];

const today = new Date();
function seed(monthsAgo, day, categoryId, amount, description, payeeName, covers = false) {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, day);
  if (d > today) return; // nothing dated in the future
  entries.push({
    id: nextEntryId++, categoryId, entryDate: ymd(d), amount, description, payeeName,
    periodMonth: covers ? ymd(new Date(d.getFullYear(), d.getMonth(), 1)) : null,
    referenceNo: null, createdBy: 1, createdAt: d.toISOString(),
  });
}
for (let m = 0; m < 4; m += 1) {
  seed(m, 1, 1, 1200, 'Monthly office rent', 'City Properties', true);
  seed(m, 10, 4, 250 + m * 20, 'Social media ads', 'Meta Ads');
  seed(m, 12, 3, 180, 'Electricity and water', 'City Utilities', true);
  seed(m, 12, 3, 65, 'Internet', 'FastNet ISP', true);
  seed(m, 15, 5, 85, 'Stationery and printing', 'Office Mart');
  if (m % 2 === 0) seed(m, 20, 7, 600, 'Workshop fee', 'Study Abroad Fair');
  seed(m, 28, 2, 1500, 'Monthly salary', 'Asha Rai', true);
  seed(m, 28, 2, 1450, 'Monthly salary', 'Bikash Shrestha', true);
  seed(m, 28, 2, 900, 'Monthly salary', 'Front Desk Staff', true);
}

// ---------- helpers ----------
function access(action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  if (!user.permissions.some((p) => p.module === 'accounts' && p.action === action)) {
    throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  }
  return user;
}

const categoryOf = (id) => categories.find((c) => c.id === Number(id));
const personOf = (id) => ({ id, fullName: USER_NAMES[id] ?? `User ${id}` });
const serialize = ({ categoryId, createdBy, ...rest }) => {
  const c = categoryOf(categoryId);
  return copy({ ...rest, category: { id: c.id, name: c.name, kind: c.kind }, createdBy: personOf(createdBy) });
};
const match = (text, needle) => String(text ?? '').toLowerCase().includes(String(needle).toLowerCase());
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) && !Number.isNaN(Date.parse(v));

function validateEntry(p, { partial = false } = {}) {
  const details = [];
  if (!partial || 'categoryId' in p) {
    const c = categoryOf(p.categoryId);
    if (!c) details.push({ field: 'categoryId', message: 'Choose a category.' });
    else if (!c.isActive && !partial) details.push({ field: 'categoryId', message: 'That category is inactive.' });
  }
  if (!partial || 'entryDate' in p) if (!isDate(p.entryDate)) details.push({ field: 'entryDate', message: 'Choose a date.' });
  if (!partial || 'amount' in p) if (!(Number(p.amount) > 0)) details.push({ field: 'amount', message: 'Enter an amount greater than zero.' });
  if (p.periodMonth && !/^\d{4}-\d{2}-01$/.test(p.periodMonth)) details.push({ field: 'periodMonth', message: 'Use the first day of the month.' });
  if (details.length) throw validation(details);
}

// ---------- categories ----------
export async function listCategories(params = {}) {
  await delay(120);
  access('view');
  return copy(categories.filter((c) => c.isActive || params.includeInactive));
}

export async function createCategory(payload) {
  await delay();
  access('create');
  const details = [];
  const name = payload.name?.trim();
  if (!name) details.push({ field: 'name', message: 'Enter a name.' });
  if (!['income', 'expense'].includes(payload.kind)) details.push({ field: 'kind', message: 'Choose income or expense.' });
  if (details.length) throw validation(details);
  if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError(409, 'CONFLICT', 'A category with that name already exists.');
  }
  const category = { id: nextCategoryId++, name, kind: payload.kind, isActive: true };
  categories.push(category);
  return copy(category);
}

export async function updateCategory(id, payload) {
  await delay();
  access('update');
  const category = categoryOf(id);
  if (!category) throw new ApiError(404, 'NOT_FOUND', 'Category not found.');
  if ('name' in payload) {
    const name = payload.name?.trim();
    if (!name) throw validation([{ field: 'name', message: 'Enter a name.' }]);
    if (categories.some((c) => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, 'CONFLICT', 'A category with that name already exists.');
    }
    category.name = name;
  }
  if ('isActive' in payload) category.isActive = Boolean(payload.isActive);
  return copy(category);
}

// ---------- entries ----------
export async function listEntries(params = {}) {
  await delay();
  access('view');
  const { from, to, categoryId, kind, q, page = 1, limit = 20, sort = '-entryDate' } = params;

  let rows = [...entries];
  if (from) rows = rows.filter((e) => e.entryDate >= from);
  if (to) rows = rows.filter((e) => e.entryDate <= to);
  if (categoryId) rows = rows.filter((e) => e.categoryId === Number(categoryId));
  if (kind) rows = rows.filter((e) => categoryOf(e.categoryId).kind === kind);
  if (q) rows = rows.filter((e) => match(e.description, q) || match(e.payeeName, q) || match(e.referenceNo, q));

  const descending = sort.startsWith('-');
  const field = sort.replace(/^-/, '');
  rows.sort((a, b) => {
    const cmp = field === 'amount' ? a.amount - b.amount : String(a[field]).localeCompare(String(b[field]));
    return (descending ? -cmp : cmp) || b.id - a.id;
  });

  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  return {
    data: rows.slice(start, start + Number(limit)).map(serialize),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}

export async function createEntry(payload) {
  await delay();
  const user = access('create');
  validateEntry(payload);
  const entry = {
    id: nextEntryId++, categoryId: Number(payload.categoryId), entryDate: payload.entryDate, amount: Number(payload.amount),
    description: payload.description?.trim() || null, payeeName: payload.payeeName?.trim() || null,
    periodMonth: payload.periodMonth || null, referenceNo: payload.referenceNo?.trim() || null,
    createdBy: user.id, createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  return serialize(entry);
}

export async function updateEntry(id, payload) {
  await delay();
  access('update');
  const entry = entries.find((e) => e.id === Number(id));
  if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Entry not found.');
  validateEntry(payload, { partial: true });
  if ('categoryId' in payload) entry.categoryId = Number(payload.categoryId);
  if ('entryDate' in payload) entry.entryDate = payload.entryDate;
  if ('amount' in payload) entry.amount = Number(payload.amount);
  ['description', 'payeeName', 'referenceNo'].forEach((k) => {
    if (k in payload) entry[k] = payload[k]?.trim() || null;
  });
  if ('periodMonth' in payload) entry.periodMonth = payload.periodMonth || null;
  return serialize(entry);
}

export async function deleteEntry(id) {
  await delay();
  access('delete');
  const entry = entries.find((e) => e.id === Number(id));
  if (!entry) throw new ApiError(404, 'NOT_FOUND', 'Entry not found.');
  entries.splice(entries.indexOf(entry), 1);
}

// ---------- summary ----------
export async function getSummary({ month } = {}) {
  await delay();
  access('view');
  const key = month || `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const totals = new Map();
  entries.filter((e) => e.entryDate.startsWith(key)).forEach((e) => {
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  });
  const byCategory = [...totals.entries()]
    .map(([categoryId, total]) => ({ categoryId, name: categoryOf(categoryId).name, kind: categoryOf(categoryId).kind, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
  const sum = (kind) => Math.round(byCategory.filter((c) => c.kind === kind).reduce((s, c) => s + c.total, 0) * 100) / 100;
  const totalIncome = sum('income');
  const totalExpense = sum('expense');
  return { month: key, totalIncome, totalExpense, net: Math.round((totalIncome - totalExpense) * 100) / 100, byCategory };
}
