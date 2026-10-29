// In-memory fake of the tasks endpoints, following the API contract.
// Scope "own" = assigned to or created by the user.
import { ApiError } from '../api/ApiError';
import { getMockCurrentUser } from './auth';
import { USER_NAMES } from './data';
import { findMockLead } from './leads';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const at = (dayOffset, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const person = (id) => (id ? { id: Number(id), fullName: USER_NAMES[id] ?? `User ${id}` } : null);

// [leadId, title, description, dayOffset, hour, status]
const SEEDS = [
  [1, 'Confirm counseling session', 'Call to confirm the time and what to bring.', 0, 15, 'open'],
  [2, 'Send university shortlist', null, 0, 11, 'open'],
  [3, 'Follow up on IELTS booking', 'Ask whether the test date is booked.', -1, 10, 'open'],
  [4, 'Request academic transcripts', null, -3, 14, 'open'],
  [5, 'Share scholarship options', null, 1, 10, 'open'],
  [6, 'Book counseling meeting', null, 2, 16, 'open'],
  [7, 'Collect passport copy', null, 5, 11, 'open'],
  [8, 'Discuss visa timeline with parents', 'Parents prefer a call after 6 pm.', -2, 18, 'open'],
  [9, 'Intro call', null, 0, 9, 'open'],
  [10, 'Send fee structure', null, 3, 13, 'open'],
  [11, 'Follow up after counseling meeting', null, -5, 10, 'done'],
  [12, 'Confirm documents received', null, -1, 15, 'done'],
  [13, 'Check SOP draft', null, 4, 12, 'open'],
  [14, 'Remind about test registration deadline', null, 7, 10, 'open'],
  [15, 'Call back about budget', null, -4, 17, 'open'],
  [16, 'Send course comparison', null, 0, 17, 'open'],
];

let nextTaskId = 1;
const tasks = SEEDS.map(([leadId, title, description, dayOffset, hour, status]) => {
  const lead = findMockLead(leadId);
  return {
    id: nextTaskId++,
    title,
    description,
    dueAt: at(dayOffset, hour),
    status,
    lead: { id: lead.id, fullName: lead.fullName },
    student: null,
    assignedTo: { ...lead.assignedTo },
    createdBy: { ...lead.createdBy },
    completedAt: status === 'done' ? at(dayOffset, hour + 1) : null,
    createdAt: at(dayOffset - 7, 9),
    updatedAt: at(dayOffset - 7, 9),
  };
});

const serialize = (task) => copy({ ...task, isOverdue: task.status === 'open' && new Date(task.dueAt) < new Date() });

// ---------- permission helpers ----------
function access(action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  const permission = user.permissions.find((p) => p.module === 'tasks' && p.action === action);
  if (!permission) throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  return { user, scope: permission.scope };
}

const inScope = (task, user, scope) =>
  scope === 'all' || task.assignedTo?.id === user.id || task.createdBy?.id === user.id;

function findTask(id, action) {
  const { user, scope } = access(action);
  const task = tasks.find((t) => t.id === Number(id));
  if (!task || !inScope(task, user, scope)) throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  return { task, user };
}

const validation = (details) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);

// ---------- endpoints ----------
export async function listTasks(params = {}) {
  await delay();
  const { user, scope } = access('view');
  const { view = 'all', status, assignedTo, leadId, studentId, page = 1, limit = 20, sort = 'dueAt' } = params;

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  let rows = tasks.filter((t) => inScope(t, user, scope));
  if (view === 'today') {
    rows = rows.filter((t) => t.status === 'open' && new Date(t.dueAt) >= startOfToday && new Date(t.dueAt) <= endOfToday);
  } else if (view === 'overdue') {
    rows = rows.filter((t) => t.status === 'open' && new Date(t.dueAt) < now);
  } else if (view === 'upcoming') {
    rows = rows.filter((t) => t.status === 'open' && new Date(t.dueAt) > endOfToday);
  }
  if (status) rows = rows.filter((t) => t.status === status);
  if (assignedTo) rows = rows.filter((t) => t.assignedTo?.id === Number(assignedTo));
  if (leadId) rows = rows.filter((t) => t.lead?.id === Number(leadId));
  if (studentId) rows = rows.filter((t) => t.student?.id === Number(studentId));

  const descending = sort.startsWith('-');
  const field = sort.replace(/^-/, '');
  rows = [...rows].sort((a, b) => {
    const cmp = String(a[field]).localeCompare(String(b[field]));
    return descending ? -cmp : cmp;
  });

  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  return {
    data: rows.slice(start, start + Number(limit)).map(serialize),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}

export async function createTask(payload) {
  await delay();
  const { user } = access('create');
  const details = [];
  if (!payload.title?.trim()) details.push({ field: 'title', message: 'Enter a title.' });
  if (!payload.dueAt || Number.isNaN(Date.parse(payload.dueAt))) details.push({ field: 'dueAt', message: 'Choose a due date and time.' });
  const lead = payload.leadId ? findMockLead(payload.leadId) : null;
  if (!payload.leadId && !payload.studentId) details.push({ field: 'leadId', message: 'Choose a lead.' });
  else if (payload.leadId && !lead) details.push({ field: 'leadId', message: 'Lead not found.' });
  if (payload.assignedTo && !USER_NAMES[payload.assignedTo]) details.push({ field: 'assignedTo', message: 'Choose a valid user.' });
  if (details.length) throw validation(details);

  const task = {
    id: nextTaskId++,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    dueAt: new Date(payload.dueAt).toISOString(),
    status: 'open',
    lead: lead ? { id: lead.id, fullName: lead.fullName } : null,
    student: payload.studentId ? { id: Number(payload.studentId), fullName: `Student ${payload.studentId}` } : null,
    assignedTo: person(payload.assignedTo ?? user.id),
    createdBy: person(user.id),
    completedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  tasks.push(task);
  return serialize(task);
}

export async function updateTask(id, payload) {
  await delay();
  const { task } = findTask(id, 'update');
  if (task.status === 'done') throw new ApiError(409, 'CONFLICT', "A completed task can't be edited.");
  const details = [];
  if ('title' in payload && !payload.title?.trim()) details.push({ field: 'title', message: 'Enter a title.' });
  if ('dueAt' in payload && Number.isNaN(Date.parse(payload.dueAt))) details.push({ field: 'dueAt', message: 'Choose a due date and time.' });
  if (payload.assignedTo && !USER_NAMES[payload.assignedTo]) details.push({ field: 'assignedTo', message: 'Choose a valid user.' });
  if (details.length) throw validation(details);

  if ('title' in payload) task.title = payload.title.trim();
  if ('description' in payload) task.description = payload.description?.trim() || null;
  if ('dueAt' in payload) task.dueAt = new Date(payload.dueAt).toISOString();
  if (payload.assignedTo) task.assignedTo = person(payload.assignedTo);
  task.updatedAt = nowIso();
  return serialize(task);
}

export async function completeTask(id) {
  await delay(150);
  const { task } = findTask(id, 'update');
  if (task.status === 'done') throw new ApiError(409, 'CONFLICT', 'This task is already completed.');
  task.status = 'done';
  task.completedAt = nowIso();
  task.updatedAt = nowIso();
  return serialize(task);
}

export async function deleteTask(id) {
  await delay();
  const { task } = findTask(id, 'delete');
  tasks.splice(tasks.indexOf(task), 1);
}
