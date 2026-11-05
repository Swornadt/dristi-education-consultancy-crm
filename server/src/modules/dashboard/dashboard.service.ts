import { JwtPayload } from '../../types/auth';
import * as queries from './dashboard.queries';

export async function getSummary(user: JwtPayload, month?: string) {
  const target     = month ?? new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const monthStart = `${target}-01`;

  const scope  = user.permissions.find(p => p.module === 'dashboard' && p.action === 'view')?.scope ?? 'own';
  const userId = user.id;

  // Run all queries in parallel — none depend on each other.
  const [
    leadsByStatus,
    leadsBySource,
    newLeadsThisMonth,
    conversionsThisMonth,
    tasksDueToday,
    tasksOverdue,
    applicationsByStatus,
    upcomingDeadlines,
  ] = await Promise.all([
    queries.leadsByStatus(scope, userId),
    queries.leadsBySource(scope, userId),
    queries.newLeadsThisMonth(monthStart, scope, userId),
    queries.conversionsThisMonth(monthStart, scope, userId),
    queries.tasksDueToday(scope, userId),
    queries.tasksOverdue(scope, userId),
    queries.applicationsByStatus(scope, userId),
    queries.upcomingDeadlines(scope, userId),
  ]);

  return {
    month: target,
    leadsByStatus,
    leadsBySource,
    newLeadsThisMonth,
    conversionsThisMonth,
    tasksDueToday,
    tasksOverdue,
    applicationsByStatus,
    upcomingDeadlines: upcomingDeadlines.map((r: any) => ({
      applicationId: Number(r.application_id),
      studentName:   r.student_name   as string,
      university:    r.university      as string,
      program:       r.program        as string,
      deadline:      r.deadline       as string,
    })),
  };
}
