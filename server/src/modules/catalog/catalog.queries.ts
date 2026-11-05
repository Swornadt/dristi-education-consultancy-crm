import { pool } from '../../config/db';

export async function listCountries(filters: any, includeInactive: boolean) {
  let query = `SELECT id, name, iso_code, is_active FROM countries WHERE 1=1`;
  const params: any[] = [];

  if (!includeInactive) {
    query += ` AND is_active = TRUE`;
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    query += ` AND name ILIKE $${params.length}`;
  }
  query += ` ORDER BY name ASC`;
  
  const { rows } = await pool.query(query, params);
  return rows;
}

export async function createCountry(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO countries (name, iso_code) VALUES ($1, $2) RETURNING *`,
    [data.name, data.isoCode ? data.isoCode.toUpperCase() : null]
  );
  return rows[0];
}

export async function updateCountry(id: number, data: any) {
  let query = `UPDATE countries SET`;
  const params: any[] = [];
  let first = true;
  const fields = [
    { key: 'name', db: 'name' },
    { key: 'isoCode', db: 'iso_code' },
    { key: 'isActive', db: 'is_active' },
  ];
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `${first ? ' ' : ', '}${f.db} = $${params.length + 1}`;
      // appy uppercase for iso
      params.push(f.key === 'isoCode' && data[f.key] ? data[f.key].toUpperCase() : data[f.key]);
      first = false;
    }
  }
  params.push(id);
  query += ` WHERE id = $${params.length} RETURNING *`;
  const { rows } = await pool.query(query, params);
  return rows[0];
}

export async function listDocumentTypes(includeInactive: boolean) {
  let query = `SELECT id, name, in_default_checklist, is_active FROM document_types WHERE 1=1`;
  if (!includeInactive) {
    query += ` AND is_active = TRUE`;
  }
  query += ` ORDER BY name ASC`;
  
  const { rows } = await pool.query(query);
  return rows;
}

export async function createDocumentType(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO document_types (name, in_default_checklist) VALUES ($1, $2) RETURNING *`,
    [data.name, data.inDefaultChecklist ?? false]
  );
  return rows[0];
}

export async function updateDocumentType(id: number, data: any) {
  let query = `UPDATE document_types SET`;
  const params: any[] = [];
  let first = true;
  const fields = [
    { key: 'name', db: 'name' },
    { key: 'inDefaultChecklist', db: 'in_default_checklist' },
    { key: 'isActive', db: 'is_active' },
  ];
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `${first ? ' ' : ', '}${f.db} = $${params.length + 1}`;
      params.push(data[f.key]);
      first = false;
    }
  }
  params.push(id);
  query += ` WHERE id = $${params.length} RETURNING *`;
  const { rows } = await pool.query(query, params);
  return rows[0];
}

export async function listUniversities(filters: any, includeInactive: boolean) {
  let query = `
    SELECT u.*, c.name as country_name
    FROM universities u
    JOIN countries c ON c.id = u.country_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!includeInactive) {
    query += ` AND u.is_active = TRUE`;
  }
  if (filters.countryId) {
    params.push(filters.countryId);
    query += ` AND u.country_id = $${params.length}`;
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    query += ` AND u.name ILIKE $${params.length}`;
  }
  query += ` ORDER BY u.name ASC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function createUniversity(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO universities (country_id, name, city, website, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.countryId, data.name, data.city || null, data.website || null, data.notes || null]
  );
  return rows[0];
}

export async function updateUniversity(id: number, data: any) {
  let query = `UPDATE universities SET updated_at = now()`;
  const params: any[] = [];
  const fields = [
    { key: 'countryId', db: 'country_id' },
    { key: 'name', db: 'name' },
    { key: 'city', db: 'city' },
    { key: 'website', db: 'website' },
    { key: 'notes', db: 'notes' },
    { key: 'isActive', db: 'is_active' },
  ];
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `, ${f.db} = $${params.length + 1}`;
      params.push(data[f.key]);
    }
  }
  params.push(id);
  query += ` WHERE id = $${params.length} RETURNING *`;
  const { rows } = await pool.query(query, params);
  return rows[0];
}

export async function listPrograms(filters: any, includeInactive: boolean) {
  let query = `
    SELECT p.*, 
           u.name as university_name, u.country_id,
           c.name as country_name
    FROM programs p
    JOIN universities u ON u.id = p.university_id
    JOIN countries c ON c.id = u.country_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!includeInactive) {
    query += ` AND p.is_active = TRUE`;
  }
  if (filters.universityId) {
    params.push(filters.universityId);
    query += ` AND p.university_id = $${params.length}`;
  }
  if (filters.countryId) {
    params.push(filters.countryId);
    query += ` AND u.country_id = $${params.length}`;
  }
  if (filters.level) {
    params.push(filters.level);
    query += ` AND p.level = $${params.length}`;
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    query += ` AND p.name ILIKE $${params.length}`;
  }
  query += ` ORDER BY p.name ASC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function createProgram(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO programs (university_id, name, level, field_of_study, duration_months, tuition_fee, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.universityId, data.name, data.level, data.fieldOfStudy || null, data.durationMonths || null, data.tuitionFee || null, data.currency || null]
  );
  return rows[0];
}

export async function updateProgram(id: number, data: any) {
  let query = `UPDATE programs SET updated_at = now()`;
  const params: any[] = [];
  const fields = [
    { key: 'universityId', db: 'university_id' },
    { key: 'name', db: 'name' },
    { key: 'level', db: 'level' },
    { key: 'fieldOfStudy', db: 'field_of_study' },
    { key: 'durationMonths', db: 'duration_months' },
    { key: 'tuitionFee', db: 'tuition_fee' },
    { key: 'currency', db: 'currency' },
    { key: 'isActive', db: 'is_active' },
  ];
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `, ${f.db} = $${params.length + 1}`;
      params.push(data[f.key]);
    }
  }
  params.push(id);
  query += ` WHERE id = $${params.length} RETURNING *`;
  const { rows } = await pool.query(query, params);
  return rows[0];
}

export async function listIntakes(filters: any, includeInactive: boolean) {
  let query = `
    SELECT pi.*, 
           to_char(pi.application_deadline, 'YYYY-MM-DD') as application_deadline_str,
           p.name as program_name, p.level as program_level,
           u.id as university_id, u.name as university_name,
           c.id as country_id, c.name as country_name
    FROM program_intakes pi
    JOIN programs p ON p.id = pi.program_id
    JOIN universities u ON u.id = p.university_id
    JOIN countries c ON c.id = u.country_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!includeInactive) {
    query += ` AND pi.is_active = TRUE`;
  }
  if (filters.programId) {
    params.push(filters.programId);
    query += ` AND pi.program_id = $${params.length}`;
  }
  if (filters.year) {
    params.push(filters.year);
    query += ` AND pi.year = $${params.length}`;
  }
  query += ` ORDER BY pi.year DESC, pi.term ASC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function createIntake(data: any) {
  const { rows } = await pool.query(
    `INSERT INTO program_intakes (program_id, term, year, application_deadline)
     VALUES ($1, $2, $3, $4::date) 
     RETURNING id, program_id, term, year, 
               to_char(application_deadline, 'YYYY-MM-DD') as application_deadline_str, 
               is_active`,
    [data.programId, data.term, data.year, data.applicationDeadline || null]
  );
  return rows[0];
}

export async function updateIntake(id: number, data: any) {
  let query = `UPDATE program_intakes SET`;
  const params: any[] = [];
  const fields = [
    { key: 'programId', db: 'program_id' },
    { key: 'term', db: 'term' },
    { key: 'year', db: 'year' },
    { key: 'applicationDeadline', db: 'application_deadline', cast: '::date' },
    { key: 'isActive', db: 'is_active' },
  ];
  let first = true;
  for (const f of fields) {
    if (data[f.key] !== undefined) {
      query += `${first ? ' ' : ', '}${f.db} = $${params.length + 1}${f.cast || ''}`;
      params.push(data[f.key]);
      first = false;
    }
  }
  params.push(id);
  query += ` WHERE id = $${params.length} 
             RETURNING id, program_id, term, year, 
                       to_char(application_deadline, 'YYYY-MM-DD') as application_deadline_str, 
                       is_active`;
  const { rows } = await pool.query(query, params);
  return rows[0];
}