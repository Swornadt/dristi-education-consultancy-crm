import { useEffect, useState } from 'react';
import { listIntakePage, listProgramPage, listUniversityPage } from '../api/catalog';
import { listCountries } from '../api/lookups';

const fetchUniversities = (countryId) => listUniversityPage({ countryId, limit: 100 }).then((r) => r.data);
const fetchPrograms = (universityId) => listProgramPage({ universityId, limit: 100 }).then((r) => r.data);
const fetchIntakes = (programId) => listIntakePage({ programId, limit: 100 }).then((r) => r.data);

// Loads the children of a selected parent; clears them when the parent is cleared.
function useChildren(parentId, fetcher) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!parentId) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetcher(parentId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, fetcher]);

  return { items, loading };
}

// Options for the cascade country > university > program > intake.
// Pass the ids selected so far; each level loads once its parent is chosen.
export default function useCatalogCascade({ countryId, universityId, programId } = {}) {
  const [countries, setCountries] = useState([]);
  useEffect(() => {
    let cancelled = false;
    listCountries()
      .then((rows) => {
        if (!cancelled) setCountries(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const universities = useChildren(countryId, fetchUniversities);
  const programs = useChildren(universityId, fetchPrograms);
  const intakes = useChildren(programId, fetchIntakes);

  return {
    countries,
    universities: universities.items,
    programs: programs.items,
    intakes: intakes.items,
    loading: { universities: universities.loading, programs: programs.loading, intakes: intakes.loading },
  };
}
