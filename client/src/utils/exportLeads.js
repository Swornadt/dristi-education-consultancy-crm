import { listLeads } from '../api/leads';
import { LEAD_SOURCES, LEAD_STATUSES, INTAKE_TERMS, labelOf } from '../config/leadOptions';
import { formatDate } from './format';
import { downloadCsv, todayString } from './csv';

// Column definitions for the leads CSV.
const COLUMNS = [
  { header: 'ID', format: (l) => l.id },
  { header: 'Full name', format: (l) => l.fullName },
  { header: 'Phone', format: (l) => l.phone ?? '' },
  { header: 'Email', format: (l) => l.email ?? '' },
  { header: 'Status', format: (l) => labelOf(LEAD_STATUSES, l.status) },
  { header: 'Source', format: (l) => labelOf(LEAD_SOURCES, l.source) },
  { header: 'Destination country', format: (l) => l.destinationCountry?.name ?? '' },
  { header: 'Intake term', format: (l) => (l.desiredIntake ? labelOf(INTAKE_TERMS, l.desiredIntake.term) : '') },
  { header: 'Intake year', format: (l) => l.desiredIntake?.year ?? '' },
  { header: 'Test status', format: (l) => l.testStatus },
  { header: 'Assigned to', format: (l) => l.assignedTo?.fullName ?? '' },
  { header: 'Added by', format: (l) => l.createdBy?.fullName ?? '' },
  { header: 'Date added', format: (l) => formatDate(l.createdAt) },
  { header: 'Converted', format: (l) => (l.convertedAt ? formatDate(l.convertedAt) : '') },
  { header: 'Lost reason', format: (l) => l.lostReason ?? '' },
  { header: 'Notes', format: (l) => l.notes ?? '' },
];

// Fetches ALL leads matching the current filters (pages through the API) and downloads them.
// Returns the number of rows exported. Throws if any request fails.
export async function exportLeads(filters = {}) {
  const PAGE = 200;
  const all = [];
  let page = 1;

  while (true) {
    const res = await listLeads({ ...filters, page, limit: PAGE, sort: 'createdAt' });
    all.push(...res.data);
    if (all.length >= res.meta.total || res.data.length < PAGE) break;
    page += 1;
  }

  const filename = `leads-export-${todayString()}.csv`;
  downloadCsv(filename, COLUMNS, all);
  return all.length;
}
