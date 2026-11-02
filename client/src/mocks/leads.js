// In-memory fake of the leads endpoints. Follows the API contract, including
// permission scope ("own" = assigned to or created by the user), validation
// errors and status rules, so the UI behaves as it will against the real server.
import { ApiError } from '../api/ApiError';
import { LEAD_STATUSES, labelOf } from '../config/leadOptions';
import { getMockCurrentUser } from './auth';
import { COUNTRIES, USER_NAMES } from './data';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const daysAgo = (n, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const person = (id) => (id ? { id: Number(id), fullName: USER_NAMES[id] ?? `User ${id}` } : null);
const country = (id) => {
  const c = COUNTRIES.find((x) => x.id === Number(id));
  return c ? { id: c.id, name: c.name } : null;
};

// ---------- seed data ----------
const NAMES = [
  'Sunita Thapa', 'Rohan Karki', 'Anisha Gurung', 'Prakash Adhikari', 'Sabina Tamang', 'Bibek Shrestha', 'Nisha Maharjan',
  'Suman Poudel', 'Pooja Khadka', 'Aayush Basnet', 'Kritika Joshi', 'Dipesh Rana', 'Manisha Bhandari', 'Ramesh Lama',
  'Smriti Pandey', 'Nabin Oli', 'Rashmi Acharya', 'Sanjay Magar', 'Alisha Koirala', 'Hari Neupane', 'Binita Sherpa',
  'Kiran Dahal', 'Sarita Bista', 'Ujjwal Chaudhary', 'Rita Subedi', 'Anil Regmi', 'Gita Thakuri', 'Sagar Ghimire',
];
const SOURCES = ['facebook', 'walk_in', 'website', 'referral', 'instagram', 'event', 'phone', 'other'];
const STATUSES = ['new', 'contacted', 'counseling_scheduled', 'new', 'contacted', 'lost', 'converted'];
const TESTS = ['not_taken', 'preparing', 'booked', 'completed'];
const TERMS = ['fall', 'spring', 'summer', 'fall', 'winter'];

let nextLeadId = NAMES.length + 1;
let nextActivityId = 1;
let nextStudentId = 200;

const activities = [];
const addActivityRow = (leadId, type, content, userId, occurredAt = nowIso()) => {
  const row = { id: nextActivityId++, leadId, type, content, occurredAt, createdBy: person(userId) };
  activities.push(row);
  return row;
};

const leads = NAMES.map((fullName, i) => {
  const id = i + 1;
  const status = STATUSES[i % STATUSES.length];
  const assignee = i % 3 === 0 ? 4 : 3;
  const creator = i % 2 === 0 ? 5 : assignee;
  const noEmail = i % 5 === 0;
  const noPhone = !noEmail && i % 7 === 3;
  const createdAt = daysAgo(40 - i, 9 + (i % 6));
  const lead = {
    id,
    fullName,
    email: noEmail ? null : `${fullName.toLowerCase().replace(' ', '.')}@example.com`,
    phone: noPhone ? null : `+977-98${String(10000000 + i * 1371).padStart(8, '0')}`,
    source: SOURCES[i % SOURCES.length],
    destinationCountry: country((i % COUNTRIES.length) + 1),
    desiredIntake: i % 6 === 5 ? null : { term: TERMS[i % TERMS.length], year: i % 4 === 0 ? 2026 : 2027 },
    testStatus: TESTS[i % TESTS.length],
    status,
    lostReason: status === 'lost' ? 'Chose to study locally' : null,
    notes: i % 3 === 0 ? 'Prefers evening calls.' : null,
    assignedTo: person(assignee),
    createdBy: person(creator),
    convertedAt: status === 'converted' ? daysAgo(5) : null,
    studentId: status === 'converted' ? 100 + i : null,
    createdAt,
    updatedAt: createdAt,
  };
  addActivityRow(id, 'note', `Inquiry received via ${lead.source.replace('_', ' ')}.`, creator, createdAt);
  addActivityRow(id, i % 2 ? 'call' : 'meeting', i % 2 ? 'Intro call. Discussed destination and budget.' : 'Counseling session at the office.', assignee, daysAgo(30 - i, 14));
  return lead;
});

// ---------- permission helpers ----------
function access(action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  const permission = user.permissions.find((p) => p.module === 'leads' && p.action === action);
  if (!permission) throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  return { user, scope: permission.scope };
}

const inScope = (lead, user, scope) =>
  scope === 'all' || lead.assignedTo?.id === user.id || lead.createdBy?.id === user.id;

function findLead(id, action) {
  const { user, scope } = access(action);
  const lead = leads.find((l) => l.id === Number(id));
  if (!lead || !inScope(lead, user, scope)) throw new ApiError(404, 'NOT_FOUND', 'Lead not found.');
  return { lead, user };
}

function assertContact(lead) {
  if (!lead.email && !lead.phone) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [
      { field: 'phone', message: 'Enter a phone number or an email.' },
    ]);
  }
}

// ---------- endpoints ----------
export async function listLeads(params = {}) {
  await delay();
  const { user, scope } = access('view');
  const {
    page = 1, limit = 20, sort = '-createdAt',
    status, source, assignedTo, destinationCountryId, intakeYear, createdFrom, createdTo, q,
  } = params;

  let rows = leads.filter((l) => inScope(l, user, scope));
  if (status) rows = rows.filter((l) => l.status === status);
  if (source) rows = rows.filter((l) => l.source === source);
  if (assignedTo) rows = rows.filter((l) => l.assignedTo?.id === Number(assignedTo));
  if (destinationCountryId) rows = rows.filter((l) => l.destinationCountry?.id === Number(destinationCountryId));
  if (intakeYear) rows = rows.filter((l) => l.desiredIntake?.year === Number(intakeYear));
  if (createdFrom) rows = rows.filter((l) => l.createdAt.slice(0, 10) >= createdFrom);
  if (createdTo) rows = rows.filter((l) => l.createdAt.slice(0, 10) <= createdTo);
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((l) => [l.fullName, l.email, l.phone].some((v) => v && v.toLowerCase().includes(needle)));
  }

  const descending = sort.startsWith('-');
  const field = sort.replace(/^-/, '');
  rows = [...rows].sort((a, b) => {
    const cmp = String(a[field]).localeCompare(String(b[field]));
    return descending ? -cmp : cmp;
  });

  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  return {
    data: copy(rows.slice(start, start + Number(limit))),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}

export async function getLead(id) {
  await delay();
  return copy(findLead(id, 'view').lead);
}

export async function createLead(payload) {
  await delay();
  const { user } = access('create');
  const details = [];
  if (!payload.fullName?.trim()) details.push({ field: 'fullName', message: "Enter the lead's name." });
  if (!payload.email && !payload.phone) details.push({ field: 'phone', message: 'Enter a phone number or an email.' });
  if (details.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);

  const assignedTo = payload.assignedTo ?? (user.role === 'counselor' ? user.id : null);
  const lead = {
    id: nextLeadId++,
    fullName: payload.fullName.trim(),
    email: payload.email || null,
    phone: payload.phone || null,
    source: payload.source || 'other',
    destinationCountry: country(payload.destinationCountryId),
    desiredIntake: payload.desiredIntake || null,
    testStatus: payload.testStatus || 'not_taken',
    status: 'new',
    lostReason: null,
    notes: payload.notes || null,
    assignedTo: person(assignedTo),
    createdBy: person(user.id),
    convertedAt: null,
    studentId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  leads.push(lead);
  return copy(lead);
}

export async function updateLead(id, payload) {
  await delay();
  const { lead } = findLead(id, 'update');
  const next = { ...lead };
  if ('fullName' in payload) next.fullName = String(payload.fullName).trim();
  if ('email' in payload) next.email = payload.email || null;
  if ('phone' in payload) next.phone = payload.phone || null;
  if ('source' in payload) next.source = payload.source;
  if ('destinationCountryId' in payload) next.destinationCountry = country(payload.destinationCountryId);
  if ('desiredIntake' in payload) next.desiredIntake = payload.desiredIntake || null;
  if ('testStatus' in payload) next.testStatus = payload.testStatus;
  if ('notes' in payload) next.notes = payload.notes || null;
  if ('assignedTo' in payload && payload.assignedTo) next.assignedTo = person(payload.assignedTo);
  if (!next.fullName) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'fullName', message: "Enter the lead's name." }]);
  }
  assertContact(next);
  Object.assign(lead, next, { updatedAt: nowIso() });
  return copy(lead);
}

export async function updateLeadStatus(id, { status, lostReason } = {}) {
  await delay();
  const { lead, user } = findLead(id, 'update');
  if (lead.status === 'converted') throw new ApiError(409, 'CONFLICT', 'A converted lead cannot change status.');
  if (status === 'converted') throw new ApiError(409, 'CONFLICT', 'Use "Convert to student" to convert a lead.');
  if (!LEAD_STATUSES.some((s) => s.value === status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'status', message: 'Choose a valid status.' }]);
  }
  if (status === 'lost' && !lostReason?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: 'lostReason', message: 'Enter a reason.' }]);
  }
  const from = lead.status;
  lead.status = status;
  lead.lostReason = status === 'lost' ? lostReason.trim() : null;
  lead.updatedAt = nowIso();
  const reason = status === 'lost' ? ` Reason: ${lead.lostReason}` : '';
  addActivityRow(lead.id, 'status_change', `Status changed from ${labelOf(LEAD_STATUSES, from)} to ${labelOf(LEAD_STATUSES, status)}.${reason}`, user.id);
  return copy(lead);
}

export async function assignLead(id, assignedTo) {
  await delay();
  const { lead, user } = findLead(id, 'update');
  lead.assignedTo = person(assignedTo);
  lead.updatedAt = nowIso();
  addActivityRow(lead.id, 'status_change', `Assigned to ${lead.assignedTo.fullName}.`, user.id);
  return copy(lead);
}

export async function convertLead(id) {
  await delay(400);
  const { lead, user } = findLead(id, 'update');
  if (!user.permissions.some((p) => p.module === 'students' && p.action === 'create')) {
    throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  }
  if (lead.status === 'converted') throw new ApiError(409, 'CONFLICT', 'This lead is already converted.');
  if (lead.status === 'lost') throw new ApiError(409, 'CONFLICT', 'A lost lead cannot be converted. Reopen it first.');
  lead.status = 'converted';
  lead.convertedAt = nowIso();
  lead.studentId = nextStudentId++;
  lead.updatedAt = nowIso();
  addActivityRow(lead.id, 'status_change', 'Converted to a student profile.', user.id);
  return { id: lead.studentId, leadId: lead.id, fullName: lead.fullName };
}

export async function deleteLead(id) {
  await delay();
  const { lead } = findLead(id, 'delete');
  leads.splice(leads.indexOf(lead), 1);
  for (let i = activities.length - 1; i >= 0; i -= 1) if (activities[i].leadId === lead.id) activities.splice(i, 1);
}

export async function listActivities(id) {
  await delay(150);
  const { lead } = findLead(id, 'view');
  const rows = activities.filter((a) => a.leadId === lead.id).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return copy(rows.map(({ leadId, ...rest }) => rest));
}

export async function addActivity(id, { type, content } = {}) {
  await delay(150);
  const { lead, user } = findLead(id, 'update');
  const details = [];
  if (!['call', 'note', 'meeting', 'email'].includes(type)) details.push({ field: 'type', message: 'Choose a type.' });
  if (!content?.trim()) details.push({ field: 'content', message: 'Write something first.' });
  if (details.length) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);
  const row = addActivityRow(lead.id, type, content.trim(), user.id);
  lead.updatedAt = nowIso();
  const { leadId, ...rest } = row;
  return copy(rest);
}

// Lets other mock modules (tasks) look up a lead.
export const findMockLead = (id) => leads.find((l) => l.id === Number(id));
export const getMockConvertedLeads = () => leads.filter((l) => l.studentId);
