// In-memory fake of the applications endpoints, following the API contract.
// Scope "own" = the student is assigned to the user, or the user created the application.
import { ApiError } from '../api/ApiError';
import { STATUS_TRANSITIONS } from '../config/applicationOptions';
import { getMockCurrentUser } from './auth';
import { getIntakeDetail } from './catalog';
import { USER_NAMES } from './data';
import { getMockStudents } from './students';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const validation = (details) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);

// ---------- seed data ----------
const PATHS = {
  draft: ['draft'],
  submitted: ['draft', 'submitted'],
  offer: ['draft', 'submitted', 'offer'],
  accepted: ['draft', 'submitted', 'offer', 'accepted'],
  rejected: ['draft', 'submitted', 'rejected'],
};
// [studentId, intakeId, status]. Student ids 106, 113, 120, 127 are the seeded converted leads.
const SEEDS = [
  [106, 1, 'draft'], [106, 9, 'submitted'], [106, 20, 'offer'],
  [113, 5, 'submitted'], [113, 15, 'accepted'],
  [120, 31, 'draft'], [120, 33, 'rejected'], [120, 40, 'submitted'],
  [127, 49, 'draft'],
];

let nextApplicationId = 1;
const applications = [];

function historyFor(status, userName) {
  const path = PATHS[status];
  return path.map((to, i) => ({
    fromStatus: i === 0 ? null : path[i - 1],
    toStatus: to,
    changedBy: userName,
    changedAt: daysAgo((path.length - i) * 4),
    note: null,
  }));
}

let seeded = false;
function seed() {
  if (seeded) return;
  seeded = true;
  SEEDS.forEach(([studentId, intakeId, status]) => {
    const student = getMockStudents().find((s) => s.id === studentId);
    const intake = getIntakeDetail(intakeId);
    if (!student || !intake) return;
    const history = historyFor(status, student.assignedTo?.fullName ?? 'Admin User');
    applications.push({
      id: nextApplicationId++, studentId, intakeId, status,
      deadline: intake.applicationDeadline,
      submittedAt: status === 'draft' ? null : history[1].changedAt,
      notes: null,
      createdBy: student.assignedTo ? { ...student.assignedTo } : { id: 1, fullName: 'Admin User' },
      createdAt: history[0].changedAt, updatedAt: history[history.length - 1].changedAt, history,
    });
  });
}

// ---------- helpers ----------
function access(action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  const permission = user.permissions.find((p) => p.module === 'applications' && p.action === action);
  if (!permission) throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  seed();
  return { user, scope: permission.scope };
}

const studentOf = (app) => getMockStudents().find((s) => s.id === app.studentId);
const inScope = (app, user, scope) =>
  scope === 'all' || studentOf(app)?.assignedTo?.id === user.id || app.createdBy.id === user.id;

function findApplication(id, action) {
  const { user, scope } = access(action);
  const app = applications.find((a) => a.id === Number(id));
  if (!app || !inScope(app, user, scope)) throw new ApiError(404, 'NOT_FOUND', 'Application not found.');
  return { app, user };
}

function serialize(app, withHistory = false) {
  const student = studentOf(app);
  const intake = getIntakeDetail(app.intakeId);
  const out = {
    id: app.id,
    student: student ? { id: student.id, fullName: student.fullName } : null,
    assignedTo: student?.assignedTo ?? null,
    intake: { id: intake.id, term: intake.term, year: intake.year },
    program: intake.program,
    university: intake.university,
    country: intake.country,
    status: app.status,
    deadline: app.deadline,
    submittedAt: app.submittedAt,
    notes: app.notes,
    createdAt: app.createdAt,
  };
  if (withHistory) out.history = app.history;
  return copy(out);
}

// ---------- endpoints ----------
export async function listApplications(params = {}) {
  await delay();
  const { user, scope } = access('view');
  const {
    page = 1, limit = 20, sort = 'deadline', studentId, status, countryId, universityId, programId, intakeId,
    assignedTo, deadlineFrom, deadlineTo,
  } = params;

  let rows = applications.filter((a) => inScope(a, user, scope));
  if (studentId) rows = rows.filter((a) => a.studentId === Number(studentId));
  if (status) rows = rows.filter((a) => a.status === status);
  if (intakeId) rows = rows.filter((a) => a.intakeId === Number(intakeId));
  if (assignedTo) rows = rows.filter((a) => studentOf(a)?.assignedTo?.id === Number(assignedTo));
  if (deadlineFrom) rows = rows.filter((a) => a.deadline && a.deadline >= deadlineFrom);
  if (deadlineTo) rows = rows.filter((a) => a.deadline && a.deadline <= deadlineTo);
  if (programId || universityId || countryId) {
    rows = rows.filter((a) => {
      const d = getIntakeDetail(a.intakeId);
      return (!programId || d.program.id === Number(programId))
        && (!universityId || d.university.id === Number(universityId))
        && (!countryId || d.country.id === Number(countryId));
    });
  }

  const descending = sort.startsWith('-');
  const field = sort.replace(/^-/, '');
  rows = [...rows].sort((a, b) => {
    const cmp = String(a[field] ?? '9999').localeCompare(String(b[field] ?? '9999'));
    return descending ? -cmp : cmp;
  });

  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  return {
    data: rows.slice(start, start + Number(limit)).map((a) => serialize(a)),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}

export async function getApplication(id) {
  await delay();
  return serialize(findApplication(id, 'view').app, true);
}

export async function createApplication(payload) {
  await delay();
  const { user, scope } = access('create');
  const details = [];
  const student = getMockStudents().find((s) => s.id === Number(payload.studentId));
  const studentVisible = student && (scope === 'all' || student.assignedTo?.id === user.id || student.createdBy?.id === user.id);
  const intake = payload.programIntakeId ? getIntakeDetail(payload.programIntakeId) : null;
  if (!studentVisible) details.push({ field: 'studentId', message: 'Choose a student.' });
  if (!intake) details.push({ field: 'programIntakeId', message: 'Choose a program and intake.' });
  if (details.length) throw validation(details);
  if (applications.some((a) => a.studentId === student.id && a.intakeId === intake.id)) {
    throw new ApiError(409, 'CONFLICT', 'This student already has an application for that intake.');
  }
  const createdAt = nowIso();
  const app = {
    id: nextApplicationId++, studentId: student.id, intakeId: intake.id, status: 'draft',
    deadline: payload.deadline ?? intake.applicationDeadline, submittedAt: null,
    notes: payload.notes?.trim() || null, createdBy: { id: user.id, fullName: USER_NAMES[user.id] ?? user.fullName },
    createdAt, updatedAt: createdAt,
    history: [{ fromStatus: null, toStatus: 'draft', changedBy: user.fullName, changedAt: createdAt, note: null }],
  };
  applications.push(app);
  return serialize(app);
}

export async function updateApplication(id, payload) {
  await delay();
  const { app } = findApplication(id, 'update');
  if ('deadline' in payload) app.deadline = payload.deadline || null;
  if ('notes' in payload) app.notes = payload.notes?.trim() || null;
  app.updatedAt = nowIso();
  return serialize(app);
}

export async function updateApplicationStatus(id, { status, note } = {}) {
  await delay();
  const { app, user } = findApplication(id, 'update');
  if (!STATUS_TRANSITIONS[app.status]?.includes(status)) {
    throw new ApiError(409, 'CONFLICT', `An application can't move from ${app.status} to ${status}.`);
  }
  const at = nowIso();
  app.history.push({ fromStatus: app.status, toStatus: status, changedBy: user.fullName, changedAt: at, note: note?.trim() || null });
  app.status = status;
  if (status === 'submitted') app.submittedAt = at;
  app.updatedAt = at;
  return serialize(app, true);
}

export async function deleteApplication(id) {
  await delay();
  const { app } = findApplication(id, 'delete');
  applications.splice(applications.indexOf(app), 1);
}
