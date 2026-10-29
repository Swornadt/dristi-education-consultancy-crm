import { useEffect, useState } from 'react';
import { listAssignableUsers, listCountries } from '../../api/lookups';

// Loads the dropdown data the lead screens need: countries and assignable counselors.
export default function useLeadLookups() {
  const [countries, setCountries] = useState([]);
  const [counselors, setCounselors] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCountries(), listAssignableUsers()])
      .then(([c, u]) => {
        if (cancelled) return;
        setCountries(c);
        setCounselors(u);
      })
      .catch(() => {
        // Dropdowns stay empty; the main screen still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, counselors };
}
