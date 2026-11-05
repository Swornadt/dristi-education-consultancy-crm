import { AppError } from '../../common/errors/AppError';
import { JwtPayload } from '../../types/auth';
import * as queries from './catalog.queries';

const mapCountry = (c: any) => ({
  id: Number(c.id),
  name: c.name,
  isoCode: c.iso_code,
  isActive: c.is_active,
});

const mapDocumentType = (d: any) => ({
  id: Number(d.id),
  name: d.name,
  inDefaultChecklist: d.in_default_checklist,
  isActive: d.is_active,
});

export async function listCountries(user: JwtPayload, filters: any) {
  const includeInactive = filters.includeInactive === 'true' && user.role === 'admin';
  try {
    const countries = await queries.listCountries(filters, includeInactive);
    return countries.map(mapCountry);
  } catch (err: any) {
    if (err.code === '22P02') throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    throw err;
  }
}

export async function createCountry(data: any) {
  try {
    const countryData = {
      ...data,
      isoCode: data.isoCode ? data.isoCode.toUpperCase() : null,
    };
    const row = await queries.createCountry(countryData);
    return mapCountry(row);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Country name or ISO code already exists', 409);
    }
    throw err;
  }
}

export async function updateCountry(id: number, data: any) {
  try {
    const countryData = {
      ...data,
      isoCode: data.isoCode ? data.isoCode.toUpperCase() : undefined,
    };
    const row = await queries.updateCountry(id, countryData);
    if (!row) throw new AppError('NOT_FOUND', 'Country not found', 404);
    return mapCountry(row);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Country name or ISO code already exists', 409);
    }
    throw err;
  }
}

export async function listDocumentTypes(user: JwtPayload, filters: any) {
  const includeInactive = filters.includeInactive === 'true' && user.role === 'admin';
  const types = await queries.listDocumentTypes(includeInactive);
  return types.map(mapDocumentType);
}

export async function createDocumentType(data: any) {
  try {
    const row = await queries.createDocumentType(data);
    return mapDocumentType(row);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Document type name already exists', 409); 
    }
    throw err;
  }
}

export async function updateDocumentType(id: number, data: any) {
  try {
    const row = await queries.updateDocumentType(id, data);
    if (!row) throw new AppError('NOT_FOUND', 'Document type not found', 404); 
    return mapDocumentType(row);
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError('CONFLICT', 'Document type name already exists', 409); 
    }
    throw err;
  }
}

const mapUniversity = (u: any) => ({
  id: Number(u.id),
  countryId: Number(u.country_id),
  name: u.name,
  city: u.city,
  website: u.website,
  notes: u.notes,
  isActive: u.is_active,
  country: u.country_name ? { id: Number(u.country_id), name: u.country_name } : undefined,
});

export async function listUniversities(user: JwtPayload, filters: any) {
  const includeInactive = filters.includeInactive === 'true' && user.role === 'admin';
  try {
    const rows = await queries.listUniversities(filters, includeInactive);
    return rows.map(mapUniversity);
  } catch (err: any) {
    if (err.code === '22P02') throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    throw err;
  }
}

export async function createUniversity(data: any) {
  try {
    const row = await queries.createUniversity(data);
    return mapUniversity(row);
  } catch (err: any) {
    if (err.code === '23503') throw new AppError('VALIDATION_ERROR', 'Country not found', 400);
    if (err.code === '23505') throw new AppError('CONFLICT', 'University with this name already exists in this country', 409);
    throw err;
  }
}

export async function updateUniversity(id: number, data: any) {
  try {
    const row = await queries.updateUniversity(id, data);
    if (!row) throw new AppError('NOT_FOUND', 'University not found', 404);
    return mapUniversity(row);
  } catch (err: any) {
    if (err.code === '23503') throw new AppError('VALIDATION_ERROR', 'Country not found', 400);
    if (err.code === '23505') throw new AppError('CONFLICT', 'University with this name already exists in this country', 409);
    throw err;
  }
}

const mapProgram = (p: any) => ({
  id: Number(p.id),
  universityId: Number(p.university_id),
  name: p.name,
  level: p.level,
  fieldOfStudy: p.field_of_study,
  durationMonths: p.duration_months ? Number(p.duration_months) : null,
  tuitionFee: p.tuition_fee ? Number(p.tuition_fee) : null,
  currency: p.currency,
  isActive: p.is_active,
  university: p.university_name ? { id: Number(p.university_id), name: p.university_name } : undefined,
  country: p.country_name ? { id: Number(p.country_id), name: p.country_name } : undefined,
});

export async function listPrograms(user: JwtPayload, filters: any) {
  const includeInactive = filters.includeInactive === 'true' && user.role === 'admin';
  try {
    const rows = await queries.listPrograms(filters, includeInactive);
    return rows.map(mapProgram);
  } catch (err: any) {
    if (err.code === '22P02') throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    throw err;
  }
}

export async function createProgram(data: any) {
  try {
    const row = await queries.createProgram(data);
    return mapProgram(row);
  } catch (err: any) {
    if (err.code === '23503') throw new AppError('VALIDATION_ERROR', 'University not found', 400);
    if (err.code === '23505') throw new AppError('CONFLICT', 'Program already exists in this university', 409);
    throw err;
  }
}

export async function updateProgram(id: number, data: any) {
  try {
    const row = await queries.updateProgram(id, data);
    if (!row) throw new AppError('NOT_FOUND', 'Program not found', 404);
    return mapProgram(row);
  } catch (err: any) {
    if (err.code === '23503') throw new AppError('VALIDATION_ERROR', 'University not found', 400);
    if (err.code === '23505') throw new AppError('CONFLICT', 'Program already exists in this university', 409);
    throw err;
  }
}

const mapIntake = (i: any) => ({
  id: Number(i.id),
  programId: Number(i.program_id),
  term: i.term,
  year: i.year,
  applicationDeadline: i.application_deadline_str || null,
  isActive: i.is_active,
  program: i.program_name ? { id: Number(i.program_id), name: i.program_name, level: i.program_level } : undefined,
  university: i.university_name ? { id: Number(i.university_id), name: i.university_name } : undefined,
  country: i.country_name ? { id: Number(i.country_id), name: i.country_name } : undefined,
});

export async function listIntakes(user: JwtPayload, filters: any) {
  const includeInactive = filters.includeInactive === 'true' && user.role === 'admin';
  try {
    const rows = await queries.listIntakes(filters, includeInactive);
    return rows.map(mapIntake);
  } catch (err: any) {
    if (err.code === '22P02') throw new AppError('VALIDATION_ERROR', 'Invalid filter value provided', 400);
    throw err;
  }
}

export async function createIntake(data: any) {
  try {
    const row = await queries.createIntake(data);
    return mapIntake(row);
  } catch (err: any) {
    if (err.code === '23503') throw new AppError('VALIDATION_ERROR', 'Program not found', 400);
    if (err.code === '23505') throw new AppError('CONFLICT', 'Intake with this term and year already exists for this program', 409);
    throw err;
  }
}

export async function updateIntake(id: number, data: any) {
  try {
    const row = await queries.updateIntake(id, data);
    if (!row) throw new AppError('NOT_FOUND', 'Intake not found', 404);
    return mapIntake(row);
  } catch (err: any) {
    if (err.code === '23503') throw new AppError('VALIDATION_ERROR', 'Program not found', 400);
    if (err.code === '23505') throw new AppError('CONFLICT', 'Intake with this term and year already exists for this program', 409);
    throw err;
  }
}