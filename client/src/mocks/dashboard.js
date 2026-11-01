// Builds the dashboard summary from the other mocks, so the numbers always match the lists.
// Each mock applies the caller's permission scope, so a counselor only gets their own figures.
import { ApiError } from '../api/ApiError';
import { APPLICATION_STATUSES } from '../config/applicationOptions';
import { LEAD_STATUSES } from '../config/leadOptions';
import { listApplications } from './applications';
import { getMockCurrentUser } from './auth';
import { listLeads } from './leads';
import { listTasks } from './tasks';

const pad = (n) => String(n).padStart(2, '0');
const dateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateString(d);
};

const countBy = (rows, key, order) => {
  const counts = new Map(order.map((value) => [value, 0]));
  rows.forEach((row) => counts.set(row[key], (counts.get(row[key]) ?? 0) + 1));
  return counts;
};

export async function getDashboardSummary({ month } = {}) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  if (!user.permissions.some((p) => p.module === 'dashboard' && p.action === 'view')) {
    throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  }

  const now = new Date();
  const monthKey = month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const [year, monthNumber] = monthKey.split('-').map(Number);
  const inMonth = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() + 1 === monthNumber;
  };

  const [leadsRes, todayRes, overdueRes, appsRes] = await Promise.all([
    listLeads({ limit: 1000 }),
    listTasks({ view: 'today', limit: 1 }),
    listTasks({ view: 'overdue', limit: 1 }),
    listApplications({ limit: 1000 }),
  ]);
  const leads = leadsRes.data;
  const apps = appsRes.data;

  const bySource = [...countBy(leads, 'source', []).entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const today = inDays(0);
  const limitDate = inDays(30);
  const upcomingDeadlines = apps
    .filter((a) => ['draft', 'submitted'].includes(a.status) && a.deadline && a.deadline >= today && a.deadline <= limitDate)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 10)
    .map((a) => ({
      applicationId: a.id,
      studentName: a.student?.fullName,
      university: a.university?.name,
      program: a.program?.name,
      deadline: a.deadline,
    }));

  return {
    month: monthKey,
    leadsByStatus: [...countBy(leads, 'status', LEAD_STATUSES.map((s) => s.value)).entries()].map(([status, count]) => ({ status, count })),
    leadsBySource: bySource,
    newLeadsThisMonth: leads.filter((l) => inMonth(l.createdAt)).length,
    conversionsThisMonth: leads.filter((l) => inMonth(l.convertedAt)).length,
    tasksDueToday: todayRes.meta.total,
    tasksOverdue: overdueRes.meta.total,
    applicationsByStatus: [...countBy(apps, 'status', APPLICATION_STATUSES.map((s) => s.value)).entries()].map(([status, count]) => ({ status, count })),
    upcomingDeadlines,
  };
}
