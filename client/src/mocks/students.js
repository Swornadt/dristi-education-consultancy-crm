// In-memory fake of the students endpoints (profile, education, test scores, document checklist).
// Students are created lazily from converted leads, so converting a lead in the UI produces a student.
// Scope "own" = assigned to or created by the user.
import { ApiError } from '../api/ApiError';
import { getMockCurrentUser } from './auth';
import { COUNTRIES, USER_NAMES } from './data';
import { DOCUMENT_TYPES } from './documentTypes';
import { saveMockFile, seedMockFile } from './files';
import { getLeadAttachments, getLeadAttachmentsOut } from './leadDocuments';
import { getMockConvertedLeads } from './leads';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const person = (id) => (id ? { id: Number(id), fullName: USER_NAMES[id] ?? `User ${id}` } : null);
const country = (id) => {
  const c = COUNTRIES.find((x) => x.id === Number(id));
  return c ? { id: c.id, name: c.name } : null;
};
const validation = (details) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);

const DOBS = ['2002-03-14', '2003-07-21', '2001-11-05', '2004-01-30'];
const COURSES = ['Nursing', 'Computer Science', 'Business Administration', 'Public Health'];

let nextEducationId = 1;
let nextScoreId = 1;
let nextItemId = 1;

const students = [];
const checklists = new Map(); // studentId -> checklist items

function defaultChecklist(studentId, seeded) {
  return DOCUMENT_TYPES.filter((t) => t.inDefaultChecklist).map((type, index) => {
    // Seeded students get a mix of statuses so the checklist looks lived-in.
    const status = !seeded ? 'pending' : index < 3 ? 'verified' : index < 5 ? 'received' : 'pending';
    const file = status === 'pending' ? null : seedMockFile(`${type.name.replace(/[^A-Za-z]+/g, '_')}.pdf`);
    return {
      id: nextItemId++,
      studentId,
      documentType: { id: type.id, name: type.name },
      status,
      file,
      remarks: null,
      verifiedBy: status === 'verified' ? person(3) : null,
      verifiedAt: status === 'verified' ? nowIso() : null,
    };
  });
}

function buildStudent(lead) {
  const id = lead.studentId;
  const seeded = id < 200;
  const n = id % 4;
  const student = {
    id,
    leadId: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    dateOfBirth: seeded ? DOBS[n] : null,
    gender: seeded ? (n % 2 ? 'Male' : 'Female') : null,
    nationality: seeded ? 'Nepali' : null,
    address: seeded && n !== 0 ? 'Kathmandu' : null,
    guardianName: seeded && n > 1 ? 'Parent / Guardian' : null,
    guardianPhone: seeded && n > 1 ? '+977-9800000000' : null,
    preferredCourses: seeded ? COURSES[n] : null,
    notes: null,
    preferredCountries: lead.destinationCountry ? [{ ...lead.destinationCountry }] : [],
    assignedTo: lead.assignedTo ? { ...lead.assignedTo } : null,
    createdBy: lead.assignedTo ? { ...lead.assignedTo } : person(1),
    education: seeded
      ? [
          { id: nextEducationId++, level: 'High School', institution: 'Sample Secondary School', fieldOfStudy: 'Science', startYear: 2018, endYear: 2020, grade: '3.4 GPA' },
          ...(n > 1 ? [{ id: nextEducationId++, level: 'Bachelor', institution: 'Sample University', fieldOfStudy: COURSES[n], startYear: 2021, endYear: 2025, grade: '3.1 GPA' }] : []),
        ]
      : [],
    testScores: seeded
      ? [{ id: nextScoreId++, testName: 'IELTS', overallScore: 6.5, sectionScores: { listening: 7, reading: 6.5, writing: 6, speaking: 6.5 }, testDate: '2026-09-20' }]
      : [],
    createdAt: lead.convertedAt || nowIso(),
    updatedAt: lead.convertedAt || nowIso(),
  };
  students.push(student);
  const list = defaultChecklist(id, seeded);
  if (!seeded) {
    // A lead converted just now: documents already attached to the lead count as received.
    getLeadAttachments(lead.id).forEach((doc) => {
      const item = list.find((i) => i.documentType.id === doc.documentTypeId && i.status === 'pending');
      if (item) {
        item.status = 'received';
        item.file = { ...doc.file };
      }
    });
  }
  checklists.set(id, list);
}

// Create a student for any converted lead that does not have one yet.
function sync() {
  getMockConvertedLeads().forEach((lead) => {
    if (!students.some((s) => s.id === lead.studentId)) buildStudent(lead);
  });
}

// ---------- permission helpers ----------
function access(module, action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  const permission = user.permissions.find((p) => p.module === module && p.action === action);
  if (!permission) throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  return { user, scope: permission.scope };
}

const inScope = (student, user, scope) =>
  scope === 'all' || student.assignedTo?.id === user.id || student.createdBy?.id === user.id;

function findStudent(id, action) {
  sync();
  const { user, scope } = access('students', action);
  const student = students.find((s) => s.id === Number(id));
  if (!student || !inScope(student, user, scope)) throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
  return { student, user };
}

// ---------- students ----------
const summary = ({ education, testScores, ...rest }) => rest;

export async function listStudents(params = {}) {
  await delay();
  sync();
  const { user, scope } = access('students', 'view');
  const { page = 1, limit = 20, sort = '-createdAt', q, assignedTo, preferredCountryId } = params;

  let rows = students.filter((s) => inScope(s, user, scope));
  if (assignedTo) rows = rows.filter((s) => s.assignedTo?.id === Number(assignedTo));
  if (preferredCountryId) rows = rows.filter((s) => s.preferredCountries.some((c) => c.id === Number(preferredCountryId)));
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((s) => [s.fullName, s.email, s.phone].some((v) => v && v.toLowerCase().includes(needle)));
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
    data: copy(rows.slice(start, start + Number(limit)).map(summary)),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}

export async function getStudent(id) {
  await delay();
  return copy(findStudent(id, 'view').student);
}

export async function updateStudent(id, payload) {
  await delay();
  const { student } = findStudent(id, 'update');
  if ('fullName' in payload && !String(payload.fullName ?? '').trim()) {
    throw validation([{ field: 'fullName', message: "Enter the student's name." }]);
  }
  ['fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'nationality', 'address', 'guardianName', 'guardianPhone', 'preferredCourses', 'notes'].forEach((key) => {
    if (key in payload) student[key] = typeof payload[key] === 'string' ? payload[key].trim() || null : payload[key] ?? null;
  });
  if (payload.assignedTo) student.assignedTo = person(payload.assignedTo);
  student.updatedAt = nowIso();
  return copy(student);
}

export async function setPreferredCountries(id, countryIds = []) {
  await delay();
  const { student } = findStudent(id, 'update');
  const found = countryIds.map(country);
  if (found.some((c) => !c)) throw validation([{ field: 'countryIds', message: 'Choose valid countries.' }]);
  student.preferredCountries = found;
}

// ---------- education and test scores ----------
function validateEducation(payload) {
  const details = [];
  if (!payload.level?.trim()) details.push({ field: 'level', message: 'Choose a level.' });
  if (!payload.institution?.trim()) details.push({ field: 'institution', message: 'Enter the institution.' });
  if (payload.startYear && payload.endYear && payload.endYear < payload.startYear) {
    details.push({ field: 'endYear', message: 'End year cannot be before the start year.' });
  }
  if (details.length) throw validation(details);
}

const educationFields = (p) => ({
  level: p.level.trim(),
  institution: p.institution.trim(),
  fieldOfStudy: p.fieldOfStudy?.trim() || null,
  startYear: p.startYear ?? null,
  endYear: p.endYear ?? null,
  grade: p.grade?.trim() || null,
});

export async function addEducation(id, payload) {
  await delay();
  const { student } = findStudent(id, 'update');
  validateEducation(payload);
  const row = { id: nextEducationId++, ...educationFields(payload) };
  student.education.push(row);
  return copy(row);
}

export async function updateEducation(id, eid, payload) {
  await delay();
  const { student } = findStudent(id, 'update');
  const row = student.education.find((e) => e.id === Number(eid));
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Education record not found.');
  validateEducation({ ...row, ...payload });
  Object.assign(row, educationFields({ ...row, ...payload }));
  return copy(row);
}

export async function deleteEducation(id, eid) {
  await delay();
  const { student } = findStudent(id, 'update');
  student.education = student.education.filter((e) => e.id !== Number(eid));
}

const TESTS = ['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'SAT', 'ACT', 'GRE', 'GMAT', 'Other'];

function validateScore(payload) {
  if (!TESTS.includes(payload.testName)) throw validation([{ field: 'testName', message: 'Choose a test.' }]);
}

const scoreFields = (p) => ({
  testName: p.testName,
  overallScore: p.overallScore ?? null,
  sectionScores: p.sectionScores ?? null,
  testDate: p.testDate ?? null,
});

export async function addTestScore(id, payload) {
  await delay();
  const { student } = findStudent(id, 'update');
  validateScore(payload);
  const row = { id: nextScoreId++, ...scoreFields(payload) };
  student.testScores.push(row);
  return copy(row);
}

export async function updateTestScore(id, sid, payload) {
  await delay();
  const { student } = findStudent(id, 'update');
  const row = student.testScores.find((t) => t.id === Number(sid));
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Test score not found.');
  validateScore({ ...row, ...payload });
  Object.assign(row, scoreFields({ ...row, ...payload }));
  return copy(row);
}

export async function deleteTestScore(id, sid) {
  await delay();
  const { student } = findStudent(id, 'update');
  student.testScores = student.testScores.filter((t) => t.id !== Number(sid));
}

// ---------- document checklist ----------
function findItem(student, itemId) {
  const item = (checklists.get(student.id) ?? []).find((i) => i.id === Number(itemId));
  if (!item) throw new ApiError(404, 'NOT_FOUND', 'Checklist item not found.');
  return item;
}

const serializeItem = ({ studentId, ...item }) => copy(item);

export async function listStudentDocuments(id) {
  await delay();
  const { student } = findStudent(id, 'view');
  access('documents', 'view');
  return { checklist: (checklists.get(student.id) ?? []).map(serializeItem), leadAttachments: getLeadAttachmentsOut(student.leadId) };
}

export async function addChecklistItem(id, documentTypeId) {
  await delay();
  const { student } = findStudent(id, 'view');
  access('documents', 'create');
  const type = DOCUMENT_TYPES.find((t) => t.id === Number(documentTypeId));
  if (!type) throw validation([{ field: 'documentTypeId', message: 'Choose a document type.' }]);
  const list = checklists.get(student.id);
  if (list.some((i) => i.documentType.id === type.id)) {
    throw new ApiError(409, 'CONFLICT', 'That document is already on the checklist.');
  }
  const item = {
    id: nextItemId++, studentId: student.id, documentType: { id: type.id, name: type.name },
    status: 'pending', file: null, remarks: null, verifiedBy: null, verifiedAt: null,
  };
  list.push(item);
  return serializeItem(item);
}

export async function updateChecklistItem(id, itemId, payload) {
  await delay(150);
  const { student, user } = findStudent(id, 'view');
  access('documents', 'update');
  const item = findItem(student, itemId);
  if ('status' in payload) {
    if (!['pending', 'received', 'verified'].includes(payload.status)) {
      throw validation([{ field: 'status', message: 'Choose a valid status.' }]);
    }
    item.status = payload.status;
    item.verifiedBy = payload.status === 'verified' ? person(user.id) : null;
    item.verifiedAt = payload.status === 'verified' ? nowIso() : null;
  }
  if ('remarks' in payload) item.remarks = payload.remarks?.trim() || null;
  return serializeItem(item);
}

export async function uploadChecklistFile(id, itemId, file) {
  await delay(400);
  const { student } = findStudent(id, 'view');
  access('documents', 'create');
  const item = findItem(student, itemId);
  item.file = saveMockFile(file);
  if (item.status === 'pending') item.status = 'received';
  return serializeItem(item);
}

export async function deleteChecklistItem(id, itemId) {
  await delay();
  const { student } = findStudent(id, 'view');
  access('documents', 'delete');
  const item = findItem(student, itemId);
  checklists.set(student.id, checklists.get(student.id).filter((i) => i !== item));
}

// Used by the applications mock to look up students (and their scope).
export function getMockStudents() {
  sync();
  return students;
}
