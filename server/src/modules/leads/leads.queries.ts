import { pool } from '../../config/db';

export async function listLeads(filters: any, scope: 'own' | 'all', userId: number) {
  let query = `
    SELECT l.*, 
           c.name as dest_country_name, 
           u1.full_name as assigned_to_name, 
           u2.full_name as created_by_name
    FROM leads l
    LEFT JOIN countries c ON c.id = l.destination_country_id
    LEFT JOIN users u1 ON u1.id = l.assigned_to
    LEFT JOIN users u2 ON u2.id = l.created_by
    WHERE 1=1
  `;
  const params: any[] = [];

  if (scope === 'own') {
    params.push(userId);
    query += ` AND (l.assigned_to = $${params.length} OR l.created_by = $${params.length})`;
  }

  if (filters.status) { params.push(filters.status); query += ` AND l.status = $${params.length}`; }
  if (filters.source) { params.push(filters.source); query += ` AND l.source = $${params.length}`; }
  if (filters.assignedTo) { params.push(filters.assignedTo); query += ` AND l.assigned_to = $${params.length}`; }
  if (filters.destinationCountryId) { params.push(filters.destinationCountryId); query += ` AND l.destination_country_id = $${params.length}`; }
  if (filters.intakeYear) { params.push(filters.intakeYear); query += ` AND l.desired_intake_year = $${params.length}`; }
  if (filters.createdFrom) { params.push(filters.createdFrom); query += ` AND l.created_at >= $${params.length}`; }
  if (filters.createdTo) { params.push(filters.createdTo); query += ` AND l.created_at <= $${params.length}`; }
  
  if (filters.q) {
    params.push(`%${filters.q}%`);
    query += ` AND (l.full_name ILIKE $${params.length} OR l.email ILIKE $${params.length} OR l.phone ILIKE $${params.length})`;
  }

  let sortField = 'l.created_at';
  if (filters.sort === 'updatedAt' || filters.sort === '-updatedAt') sortField = 'l.updated_at';
  if (filters.sort === 'fullName' || filters.sort === '-fullName') sortField = 'l.full_name';
  
  let sortOrder = filters.sort?.startsWith('-') ? 'DESC' : 'ASC';
  if (!filters.sort) sortOrder = 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getLeadById(id: number) {
  const { rows } = await pool.query(
    `SELECT l.*, c.name as dest_country_name, u1.full_name as assigned_to_name, u2.full_name as created_by_name
     FROM leads l
     LEFT JOIN countries c ON c.id = l.destination_country_id
     LEFT JOIN users u1 ON u1.id = l.assigned_to
     LEFT JOIN users u2 ON u2.id = l.created_by
     WHERE l.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createLead(data: any, createdBy: number) {
  const { rows } = await pool.query(
    `INSERT INTO leads 
      (full_name, email, phone, source, destination_country_id, desired_intake_term, desired_intake_year, test_status, notes, assigned_to, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      data.fullName, 
      data.email || null, 
      data.phone || null, 
      data.source || 'other',
      data.destinationCountryId || null, 
      data.desiredIntake?.term || null, 
      data.desiredIntake?.year || null,
      data.testStatus || 'not_taken', 
      data.notes || null, 
      data.assignedTo || null, 
      createdBy
    ]
  );
  return rows[0].id;
}

export async function updateLead(id: number, data: any) {
  let query = `UPDATE leads SET updated_at = now()`;
  const params: any[] = [];

  const fields = [
    { key: 'fullName', db: 'full_name' },
    { key: 'email', db: 'email' },
    { key: 'phone', db: 'phone' },
    { key: 'source', db: 'source' },
    { key: 'destinationCountryId', db: 'destination_country_id' },
    { key: 'testStatus', db: 'test_status' },
    { key: 'notes', db: 'notes' },
    { key: 'assignedTo', db: 'assigned_to' },
  ];

  for (const field of fields) {
    if (data[field.key] !== undefined) {
      params.push(data[field.key]);
      query += `, ${field.db} = $${params.length}`;
    }
  }

  if (data.desiredIntake) {
    if (data.desiredIntake.term) { params.push(data.desiredIntake.term); query += `, desired_intake_term = $${params.length}`; }
    if (data.desiredIntake.year) { params.push(data.desiredIntake.year); query += `, desired_intake_year = $${params.length}`; }
  }

  params.push(id);
  query += ` WHERE id = $${params.length}`;
  await pool.query(query, params);
}

export async function deleteLead(id: number) {
  await pool.query(`DELETE FROM leads WHERE id = $1`, [id]);
}

export async function updateLeadStatus(id: number, status: string, lostReason: string | null, userId: number) {
  await pool.query(
    `UPDATE leads SET status = $1, lost_reason = $2, updated_at = now() WHERE id = $3`,
    [status, lostReason, id]
  );
  
  await pool.query(
    `INSERT INTO lead_activities (lead_id, type, content, created_by) VALUES ($1, 'status_change', $2, $3)`,
    [id, `Status changed to ${status}`, userId]
  );
}

export async function assignLead(id: number, assignedTo: number) {
  await pool.query(`UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id = $2`, [assignedTo, id]);
}

export async function getActivities(leadId: number) {
  const { rows } = await pool.query(
    `SELECT a.*, u.full_name as created_by_name 
     FROM lead_activities a JOIN users u ON u.id = a.created_by 
     WHERE a.lead_id = $1 ORDER BY a.occurred_at DESC`,
    [leadId]
  );
  return rows;
}

export async function createActivity(leadId: number, data: any, userId: number) {
  const { rows } = await pool.query(
    `INSERT INTO lead_activities (lead_id, type, content, occurred_at, created_by) 
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [leadId, data.type, data.content, data.occurredAt || new Date(), userId]
  );
  return rows[0].id;
}

export async function getUserById(id: number) {
  const { rows } = await pool.query(
    `SELECT id, is_active FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}