import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './students.queries';

const mapStudent = (s: any) => ({
  id: Number(s.id),
  leadId: Number(s.lead_id),
  fullName: s.full_name,
  email: s.email,
  phone: s.phone,
  dateOfBirth: s.date_of_birth_str || null,
  gender: s.gender,
  nationality: s.nationality,
  address: s.address,
  guardianName: s.guardian_name,
  guardianPhone: s.guardian_phone,
  preferredCourses: s.preferred_courses,
  notes: s.notes,
  assignedTo: s.assigned_to ? { id: Number(s.assigned_to), fullName: s.assigned_to_name } : null,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

export async function list(user: JwtPayload, filters: any) {
  const scope = user.permissions.find(p => p.module === 'students' && p.action === 'view')?.scope || 'own';
  try {
    const students = await queries.listStudents(filters, scope, user.id);
    return students.map(mapStudent);
  } catch (err: any) {
    if (err.code === '22P02' || err.code === '22007') {
      throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    }
    throw err;
  }
}

export async function getOne(user: JwtPayload, id: number) {
  const student = await queries.getStudentById(id);
  if (!student) throw new AppError('NOT_FOUND', 'Student not found', 404);

  const scope = user.permissions.find(p => p.module === 'students' && p.action === 'view')?.scope;
  if (scope === 'own' && Number(student.assigned_to) !== Number(user.id) && Number(student.created_by) !== Number(user.id)) {
    throw new AppError('NOT_FOUND', 'Student not found', 404);
  }

  const base = mapStudent(student);
  const preferredCountries = await queries.getPreferredCountries(id);
  const education = await queries.getEducation(id);
  const testScores = await queries.getTestScores(id);

  return {
    ...base,
    preferredCountries: preferredCountries.map(c => ({ id: Number(c.id), name: c.name })),
    education: education.map(e => ({
      id: Number(e.id),
      level: e.level,
      institution: e.institution,
      fieldOfStudy: e.field_of_study,
      startYear: e.start_year,
      endYear: e.end_year,
      grade: e.grade,
    })),
    testScores: testScores.map(t => ({
      id: Number(t.id),
      testName: t.test_name,
      overallScore: t.overall_score ? Number(t.overall_score) : null,
      sectionScores: t.section_scores,
      testDate: t.test_date_str || null,
    })),
  };
}

export async function update(user: JwtPayload, id: number, data: any) {
  await getOne(user, id);

  if (data.assignedTo) {
    const targetUser = await queries.getActiveUserById(data.assignedTo);
    if (!targetUser || !targetUser.is_active) {
      throw new AppError('VALIDATION_ERROR', 'Cannot assign student to an invalid or deactivated user', 400);
    }
  }

  try {
    await queries.updateStudent(id, data);
  } catch (err: any) {
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'Invalid reference provided', 400);
    }
    throw err;
  }

  return getOne(user, id);
}

export async function updatePreferredCountries(user: JwtPayload, id: number, countryIds: number[]) {
  await getOne(user, id);
  try {
    await queries.replacePreferredCountries(id, countryIds);
  } catch (err: any) {
    if (err.code === '23503') {
      throw new AppError('VALIDATION_ERROR', 'One or more country IDs do not exist', 400);
    }
    if (err.code === '23505') {
      throw new AppError('VALIDATION_ERROR', 'Duplicate country IDs are not allowed', 400);
    }
    throw err;
  }
  return getOne(user, id);
}