import api from './client';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/dashboard';

// GET /dashboard/summary?month=YYYY-MM
// -> { month, leadsByStatus, leadsBySource, newLeadsThisMonth, conversionsThisMonth,
//      tasksDueToday, tasksOverdue, applicationsByStatus, upcomingDeadlines }
export const getDashboardSummary = (month) =>
  USE_MOCK ? mock.getDashboardSummary({ month }) : api.get('/dashboard/summary', { params: { month } }).then((r) => r.data);
