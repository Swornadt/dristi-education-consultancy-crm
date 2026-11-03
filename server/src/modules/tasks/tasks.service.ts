import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './tasks.queries';

const mapTask = (t: any) => ({
  id: Number(t.id),
  title: t.title,
  description: t.description,
  dueAt: t.due_at,
  status: t.status,
  isOverdue: t.status === 'open' && new Date(t.due_at) < new Date(),
  lead: t.lead_id ? { id: Number(t.lead_id), fullName: t.lead_name } : null,
  student: t.student_id ? { id: Number(t.student_id), fullName: t.student_name } : null,
  assignedTo: { id: Number(t.assigned_to), fullName: t.assigned_to_name },
  createdBy: { id: Number(t.created_by), fullName: t.created_by_name },
  completedAt: t.completed_at,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

export async function list(user: JwtPayload, filters: any) {
  const scope = user.permissions.find(p => p.module === 'tasks' && p.action === 'view')?.scope || 'own';
  try {
    const tasks = await queries.listTasks(filters, scope, user.id);
    return tasks.map(mapTask);
  } catch (err: any) {
    if (err.code === '22P02' || err.code === '22007') {
      throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    }
    throw err;
  }
}

export async function getOne(user: JwtPayload, id: number) {
  const task = await queries.getTaskById(id);
  if (!task) throw new AppError('NOT_FOUND', 'Task not found', 404);

  const scope = user.permissions.find(p => p.module === 'tasks' && p.action === 'view')?.scope;
  if (scope === 'own' && Number(task.assigned_to) !== Number(user.id) && Number(task.created_by) !== Number(user.id)) {
    throw new AppError('NOT_FOUND', 'Task not found', 404);
  }
  return mapTask(task);
}

export async function create(user: JwtPayload, data: any) {
  if (data.leadId) {
    const lead = await queries.getLeadById(data.leadId);
    if (!lead) throw new AppError('VALIDATION_ERROR', 'Lead not found', 400);
  }
  if (data.studentId) {
    const student = await queries.getStudentById(data.studentId);
    if (!student) throw new AppError('VALIDATION_ERROR', 'Student not found', 400);
  }
  if (data.assignedTo) {
    const targetUser = await queries.getActiveUserById(data.assignedTo);
    if (!targetUser) throw new AppError('VALIDATION_ERROR', 'Assigned user not found', 400);
    if (!targetUser.is_active) throw new AppError('VALIDATION_ERROR', 'Cannot assign task to a deactivated user', 400);
  }

  const id = await queries.createTask(data, user.id);
  return getOne(user, id);
}

export async function update(user: JwtPayload, id: number, data: any) {
  await getOne(user, id);
  
  if (data.assignedTo) {
    const targetUser = await queries.getActiveUserById(data.assignedTo);
    if (!targetUser || !targetUser.is_active) {
      throw new AppError('VALIDATION_ERROR', 'Cannot assign task to an invalid or deactivated user', 400);
    }
  }

  try {
    await queries.updateTask(id, data);
  } catch (err: any) {
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Invalid reference provided', 400);
    }
    throw err;
  }
  return getOne(user, id);
}

export async function complete(user: JwtPayload, id: number) {
  const task = await getOne(user, id);
  if (task.status !== 'open') {
    throw new AppError('CONFLICT', 'Only open tasks can be completed', 409);
  }
  await queries.completeTask(id);
  return getOne(user, id);
}

export async function remove(user: JwtPayload, id: number) {
  await getOne(user, id);
  await queries.deleteTask(id);
}