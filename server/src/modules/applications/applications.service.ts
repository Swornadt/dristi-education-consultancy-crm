import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './applications.queries';

const mapApplication = (a: any, history?: any[]) => ({
  id: Number(a.id),
  student: { id: Number(a.student_id), fullName: a.student_name },
  intake: { id: Number(a.program_intake_id), term: a.term, year: a.year },
  program: { id: Number(a.program_id), name: a.program_name, level: a.program_level },
  university: { id: Number(a.university_id), name: a.university_name },
  country: { id: Number(a.country_id), name: a.country_name },
  status: a.status,
  deadline: a.deadline_str || null,
  submittedAt: a.submitted_at,
  notes: a.notes,
  createdAt: a.created_at,
  ...(history && { history }),
});

export async function list(user: JwtPayload, filters: any) {
  const scope = user.permissions.find(p => p.module === 'applications' && p.action === 'view')?.scope || 'own';
  try {
    const rows = await queries.listApplications(filters, scope, user.id);
    return rows.map(r => mapApplication(r));
  } catch (err: any) {
    if (err.code === '22P02' || err.code === '22007') {
      throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    }
    throw err;
  }
}

export async function getOne(user: JwtPayload, id: number) {
  const app = await queries.getApplicationById(id);
  if (!app) throw new AppError('NOT_FOUND', 'Application not found', 404);

  const scope = user.permissions.find(p => p.module === 'applications' && p.action === 'view')?.scope;
  if (scope === 'own') {
    const student = await queries.getStudentById(app.student_id);
    if (student && Number(student.assigned_to) !== Number(user.id) && Number(student.created_by) !== Number(user.id)) {
      throw new AppError('NOT_FOUND', 'Application not found', 404);
    }
  }

  const history = await queries.getApplicationHistory(id);
  return mapApplication(app, history.map(h => ({
    fromStatus: h.from_status,
    toStatus: h.to_status,
    changedBy: h.changed_by_name,
    changedAt: h.changed_at,
    note: h.note,
  })));
}

export async function create(user: JwtPayload, data: any) {
  const student = await queries.getStudentById(data.studentId);
  if (!student) throw new AppError('VALIDATION_ERROR', 'Student not found', 400);

  const intake = await queries.getIntakeDeadline(data.programIntakeId);
  if (!intake) throw new AppError('VALIDATION_ERROR', 'Program intake not found', 400);

  const duplicate = await queries.checkDuplicate(data.studentId, data.programIntakeId);
  if (duplicate) throw new AppError('CONFLICT', 'Student already applied to this intake', 409);

  const deadline = data.deadline || intake.application_deadline_str || null;

  const id = await queries.createApplication({ ...data, deadline }, user.id);
  
  await queries.insertInitialHistory(id, user.id);
  
  return getOne(user, id);
}

export async function update(user: JwtPayload, id: number, data: any) {
  await getOne(user, id);
  await queries.updateApplication(id, data);
  return getOne(user, id);
}

export async function updateStatus(user: JwtPayload, id: number, newStatus: string, note?: string) {
  const app = await getOne(user, id);
  
  const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['submitted'],
    submitted: ['offer', 'rejected'],
    offer: ['accepted', 'rejected'],
    accepted: [],
    rejected: [],
  };

  const allowed = VALID_TRANSITIONS[app.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError('CONFLICT', `Cannot transition from ${app.status} to ${newStatus}`, 409);
  }

  try {
    await queries.updateApplicationStatus(id, newStatus, app.status, note || null, user.id);
  } catch (err: any) {
    if (err.message === 'CONCURRENT_MODIFICATION') {
      throw new AppError('CONFLICT', 'Application was modified by another request. Please retry.', 409);
    }
    throw err;
  }
  
  return getOne(user, id);
}

export async function remove(user: JwtPayload, id: number) {
  await getOne(user, id);
  await queries.deleteApplication(id);
}