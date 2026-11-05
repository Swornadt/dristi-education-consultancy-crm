import { useCallback, useEffect, useRef, useState } from 'react';
import { listTasks } from '../api/tasks';

const POLL_MS = 3 * 60 * 1000; // re-fetch every 3 minutes while the tab is open
const INITIAL_DELAY_MS = 4000;  // wait a bit after login so the first page load isn't slowed

export default function useTaskAlerts(enabled) {
  const [overdue, setOverdue] = useState([]);
  const [dueToday, setDueToday] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const fetch = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    Promise.all([
      listTasks({ view: 'overdue', limit: 20, sort: 'dueAt' }),
      listTasks({ view: 'today',   limit: 20, sort: 'dueAt' }),
    ])
      .then(([overdueRes, todayRes]) => {
        setOverdue(overdueRes.data);
        setDueToday(todayRes.data);
      })
      .catch(() => { /* silent: the bell just shows no count */ })
      .finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const boot = setTimeout(fetch, INITIAL_DELAY_MS);
    timer.current = setInterval(fetch, POLL_MS);
    return () => {
      clearTimeout(boot);
      clearInterval(timer.current);
    };
  }, [enabled, fetch]);

  // Called by the bell dropdown when it opens, so the list is fresh.
  const refresh = useCallback(() => fetch(), [fetch]);

  return { overdue, dueToday, loading, refresh };
}
