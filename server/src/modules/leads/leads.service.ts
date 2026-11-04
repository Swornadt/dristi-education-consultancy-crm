import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './leads.queries';
import fs from 'fs';

const mapLead = (l: any) => ({
  id: Number(l.id),
  fullName: l.full_name,
  email: l.email,
  phone: l.phone,
  source: l.source,
  destinationCountry: l.destination_country_id ? { id: Number(l.destination_country_id), name: l.dest_country_name } : null,
  desiredIntake: l.desired_intake_term ? { term: l.desired_intake_term, year: l.desired_intake_year } : null,
  testStatus: l.test_status,
  status: l.status,
  lostReason: l.lost_reason,
  notes: l.notes,
  assignedTo: l.assigned_to ? { id: Number(l.assigned_to), fullName: l.assigned_to_name } : null,
  createdBy: l.created_by ? { id: Number(l.created_by), fullName: l.created_by_name } : null,
  convertedAt: l.converted_at,
  studentId: l.student_id ? Number(l.student_id) : null,
  createdAt: l.created_at,
  updatedAt: l.updated_at,
});

export async function list(user: JwtPayload, filters: any) {
  const scope = user.permissions.find(p => p.module === 'leads' && p.action === 'view')?.scope || 'own';
  try {
    const leads = await queries.listLeads(filters, scope, user.id);
    return leads.map(mapLead);
  } catch (err: any) {
    if (err.code === '22007') {
      throw new AppError('VALIDATION_ERROR', 'Invalid date format provided in filters', 400);
    }
    if (err.code === '22P02') {
      throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    }
    throw err;
  }
}

export async function getOne(user: JwtPayload, id: number) {
  const lead = await queries.getLeadById(id);
  if (!lead) throw new AppError('NOT_FOUND', 'Lead not found', 404);
  
  const scope = user.permissions.find(p => p.module === 'leads' && p.action === 'view')?.scope;
  if (
    scope === 'own' && 
    Number(lead.assigned_to) !== Number(user.id) && 
    Number(lead.created_by) !== Number(user.id)
  ) {
    throw new AppError('NOT_FOUND', 'Lead not found', 404);
  }
  return mapLead(lead);
}

export async function create(user: JwtPayload, data: any) {
  if (user.role === 'counselor' && !data.assignedTo) {
    data.assignedTo = user.id;
  }
  const id = await queries.createLead(data, user.id);
  return getOne(user, id);
}

export async function update(user: JwtPayload, id: number, data: any) {
  const lead = await getOne(user, id);
  if (lead.status === 'converted') {
    throw new AppError('CONFLICT', 'Cannot edit a converted lead', 409);
  }
  if (user.role === 'counselor' && data.assignedTo !== undefined && Number(data.assignedTo) !== Number(user.id)) {
    throw new AppError('FORBIDDEN', 'Counselors cannot reassign leads to others', 403);
  }
  
  try {
    await queries.updateLead(id, data);
  } catch (err: any) {
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Invalid reference (e.g., destinationCountryId does not exist)', 400);
    }
    throw err;
  }
  
  return getOne(user, id);
}

export async function updateStatus(user: JwtPayload, id: number, status: string, lostReason?: string) {
  const lead = await getOne(user, id);
  if (lead.status === 'converted') {
    throw new AppError('CONFLICT', 'A converted lead cannot change status', 409);
  }
  if (status === 'converted') {
    throw new AppError('CONFLICT', 'Converted cannot be set directly; use the convert endpoint', 409);
  }
  await queries.updateLeadStatus(id, status, lostReason || null, user.id);
  return getOne(user, id);
}

export async function assign(user: JwtPayload, id: number, assignedTo: number) {
  await getOne(user, id);
  
  if (user.role === 'counselor' && Number(assignedTo) !== Number(user.id)) {
    throw new AppError('FORBIDDEN', 'Counselors can only assign leads to themselves', 403);
  }

  try {
    const targetUser = await queries.getUserById(assignedTo);
    if (!targetUser) {
      throw new AppError('VALIDATION_ERROR', 'The assignedTo user does not exist', 400);
    }
    if (!targetUser.is_active) {
      throw new AppError('VALIDATION_ERROR', 'Cannot assign leads to a deactivated user', 400);
    }

    await queries.assignLead(id, assignedTo);
  } catch (err: any) {
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'The assignedTo user does not exist', 400);
    }
    throw err;
  }
  return getOne(user, id);
}

export async function remove(user: JwtPayload, id: number) {
  const lead = await getOne(user, id);
  
  if (lead.status === 'converted') {
    throw new AppError('CONFLICT', 'Cannot delete a converted lead — it has an associated student record', 409);
  }
  
  const docs = await queries.getLeadDocumentsWithPaths(id);
  await queries.deleteLead(id);
  
  for (const doc of docs) {
    try {
      if (doc.stored_path && fs.existsSync(doc.stored_path)) {
        fs.unlinkSync(doc.stored_path);
        console.log(`Deleted file: ${doc.stored_path}`);
      }
    } catch (err) {
      console.error(`Failed to delete file ${doc.stored_path}:`, err);
    }
    
    await queries.deleteFileById(doc.file_id);
  }
}

export async function getActivities(user: JwtPayload, leadId: number) {
  await getOne(user, leadId);
  const activities = await queries.getActivities(leadId);
  return activities.map(a => ({
    id: Number(a.id),
    type: a.type,
    content: a.content,
    occurredAt: a.occurred_at,
    createdBy: { id: Number(a.created_by), fullName: a.created_by_name }
  }));
}

export async function createActivity(user: JwtPayload, leadId: number, data: any) {
  await getOne(user, leadId);
  const id = await queries.createActivity(leadId, data, user.id);
  return { id: Number(id), message: 'Activity created' };
}

export async function convert(user: JwtPayload, id: number, body: any) {
  const lead = await getOne(user, id);

  if (lead.status === 'converted') {
    throw new AppError('CONFLICT', 'Lead is already converted', 409);
  }
  if (lead.status === 'lost') {
    throw new AppError('CONFLICT', 'Cannot convert a lost lead', 409);
  }

  try {
    const student = await queries.convertLead(id, body, user.id);
    
    return {
      id: Number(student.id),
      leadId: Number(student.lead_id),
      fullName: student.full_name,
      email: student.email,
      phone: student.phone,
      dateOfBirth: student.date_of_birth,
      nationality: student.nationality,
      preferredCourses: student.preferred_courses,
      assignedTo: lead.assignedTo,
      createdAt: student.created_at,
    };
  } catch (err: any) {
    if (err.message === 'Lead is already converted' || err.message === 'Cannot convert a lost lead') {
      throw new AppError('CONFLICT', err.message, 409);
    }
    if (err.message === 'Lead not found') {
      throw new AppError('NOT_FOUND', err.message, 404);
    }
    throw err;
  }
}