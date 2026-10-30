// In-memory fake of the catalog endpoints: countries > universities > programs > intakes.
// Countries share the COUNTRIES array with the other mocks, so new countries show up in dropdowns everywhere.
import { ApiError } from '../api/ApiError';
import { getMockCurrentUser } from './auth';
import { COUNTRIES } from './data';

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
// Local date as YYYY-MM-DD, n days from today. Keeps seeded deadlines realistic whenever the demo is run.
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const copy = (value) => JSON.parse(JSON.stringify(value));
const validation = (details) => new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', details);
const conflict = (message) => new ApiError(409, 'CONFLICT', message);
const notFound = (what) => new ApiError(404, 'NOT_FOUND', `${what} not found.`);

// ---------- seed data ----------
const COUNTRY_META = new Map([
  [1, { isoCode: 'AU', isActive: true }], [2, { isoCode: 'CA', isActive: true }], [3, { isoCode: 'GB', isActive: true }],
  [4, { isoCode: 'US', isActive: true }], [5, { isoCode: 'JP', isActive: true }], [6, { isoCode: 'DE', isActive: true }],
  [7, { isoCode: 'NZ', isActive: true }],
]);
const CURRENCY = { 1: 'AUD', 2: 'CAD', 3: 'GBP', 4: 'USD', 5: 'JPY', 6: 'EUR', 7: 'NZD' };
const UNIS = [
  [1, 'University of Sydney', 'Sydney'], [1, 'University of Melbourne', 'Melbourne'], [1, 'RMIT University', 'Melbourne'],
  [2, 'University of Toronto', 'Toronto'], [2, 'University of British Columbia', 'Vancouver'], [2, 'McGill University', 'Montreal'],
  [3, 'University of Manchester', 'Manchester'], [3, 'University of Leeds', 'Leeds'],
  [4, 'Arizona State University', 'Tempe'], [4, 'University of Texas at Dallas', 'Richardson'],
  [5, 'Waseda University', 'Tokyo'], [6, 'Technical University of Munich', 'Munich'], [7, 'University of Auckland', 'Auckland'],
  [2, 'University of Waterloo', 'Waterloo'],
];
const TEMPLATES = [
  ['MSc Data Science', 'master', 'Computer Science'], ['BSc Nursing', 'bachelor', 'Health'], ['MBA', 'master', 'Business'],
  ['BEng Computer Science', 'bachelor', 'Engineering'], ['MSc Public Health', 'master', 'Health'], ['Diploma in Business', 'diploma', 'Business'],
];
const DURATION = { master: 24, bachelor: 36, diploma: 12 };

const universities = [];
const programs = [];
const intakes = [];
UNIS.forEach(([countryId, name, city], ui) => {
  const uni = { id: ui + 1, countryId, name, city, website: null, notes: null, isActive: true };
  universities.push(uni);
  [0, 2, 4].forEach((offset) => {
    const [pname, level, field] = TEMPLATES[(ui + offset) % 6];
    const program = {
      id: programs.length + 1, universityId: uni.id, name: pname, level, fieldOfStudy: field,
      durationMonths: DURATION[level], tuitionFee: 12000 + ((ui * 3 + offset) % 7) * 2500, currency: CURRENCY[countryId], isActive: true,
    };
    programs.push(program);
    intakes.push({
      id: intakes.length + 1, programId: program.id, term: 'spring', year: 2027, isActive: true,
      applicationDeadline: daysFromNow(7 + ((program.id * 3) % 21)),
    });
    intakes.push({
      id: intakes.length + 1, programId: program.id, term: 'fall', year: 2027, isActive: true,
      applicationDeadline: `2027-0${3 + (program.id % 3)}-${String(10 + (program.id % 18)).padStart(2, '0')}`,
    });
  });
});

let nextCountryId = 8;
let nextUniId = universities.length + 1;
let nextProgramId = programs.length + 1;
let nextIntakeId = intakes.length + 1;

// ---------- shapes ----------
const countryRef = (id) => {
  const c = COUNTRIES.find((x) => x.id === Number(id));
  return c ? { id: c.id, name: c.name } : null;
};
const uniRef = (id) => {
  const u = universities.find((x) => x.id === Number(id));
  return u ? { id: u.id, name: u.name } : null;
};
const countryOut = (c) => ({ id: c.id, name: c.name, isoCode: COUNTRY_META.get(c.id)?.isoCode ?? null, isActive: COUNTRY_META.get(c.id)?.isActive ?? true });
const uniOut = ({ countryId, ...rest }) => ({ ...rest, country: countryRef(countryId) });
const programOut = ({ universityId, ...rest }) => ({
  ...rest,
  university: uniRef(universityId),
  country: countryRef(universities.find((u) => u.id === universityId)?.countryId),
});
const intakeOut = ({ programId, ...rest }) => {
  const program = programs.find((p) => p.id === programId);
  const uni = universities.find((u) => u.id === program?.universityId);
  return {
    ...rest,
    program: program ? { id: program.id, name: program.name, level: program.level } : null,
    university: uni ? { id: uni.id, name: uni.name } : null,
    country: countryRef(uni?.countryId),
  };
};

// Used by the applications mock to expand an intake id.
export const getIntakeDetail = (id) => {
  const intake = intakes.find((i) => i.id === Number(id));
  return intake ? copy(intakeOut(intake)) : null;
};

// ---------- helpers ----------
function access(action) {
  const user = getMockCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please sign in again.');
  if (!user.permissions.some((p) => p.module === 'catalog' && p.action === action)) {
    throw new ApiError(403, 'FORBIDDEN', "You don't have permission to do that.");
  }
  return user;
}

const visible = (user, params) => (row) => row.isActive || (user.role === 'admin' && params.includeInactive);
const match = (text, needle) => String(text ?? '').toLowerCase().includes(String(needle).toLowerCase());

function paginate(rows, { page = 1, limit = 20 }) {
  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  return {
    data: copy(rows.slice(start, start + Number(limit))),
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.max(1, Math.ceil(total / Number(limit))) },
  };
}
const byName = (a, b) => a.name.localeCompare(b.name);

// ---------- countries ----------
export async function listCountries(params = {}) {
  await delay();
  const user = access('view');
  let rows = COUNTRIES.map(countryOut).filter(visible(user, params));
  if (params.q) rows = rows.filter((c) => match(c.name, params.q));
  return paginate(rows.sort(byName), params);
}

export async function createCountry(payload) {
  await delay();
  access('create');
  const name = payload.name?.trim();
  if (!name) throw validation([{ field: 'name', message: 'Enter a name.' }]);
  if (COUNTRIES.some((c) => c.name.toLowerCase() === name.toLowerCase())) throw conflict('That country already exists.');
  const country = { id: nextCountryId++, name };
  COUNTRIES.push(country);
  COUNTRY_META.set(country.id, { isoCode: payload.isoCode?.trim().toUpperCase() || null, isActive: true });
  return copy(countryOut(country));
}

export async function updateCountry(id, payload) {
  await delay();
  access('update');
  const country = COUNTRIES.find((c) => c.id === Number(id));
  if (!country) throw notFound('Country');
  const meta = COUNTRY_META.get(country.id) ?? { isoCode: null, isActive: true };
  if ('name' in payload) {
    if (!payload.name?.trim()) throw validation([{ field: 'name', message: 'Enter a name.' }]);
    country.name = payload.name.trim();
  }
  if ('isoCode' in payload) meta.isoCode = payload.isoCode?.trim().toUpperCase() || null;
  if ('isActive' in payload) meta.isActive = Boolean(payload.isActive);
  COUNTRY_META.set(country.id, meta);
  return copy(countryOut(country));
}

// ---------- universities ----------
export async function listUniversities(params = {}) {
  await delay();
  const user = access('view');
  let rows = universities.filter(visible(user, params));
  if (params.countryId) rows = rows.filter((u) => u.countryId === Number(params.countryId));
  if (params.q) rows = rows.filter((u) => match(u.name, params.q) || match(u.city, params.q));
  return paginate(rows.sort(byName).map(uniOut), params);
}

export async function createUniversity(payload) {
  await delay();
  access('create');
  const details = [];
  if (!payload.countryId || !countryRef(payload.countryId)) details.push({ field: 'countryId', message: 'Choose a country.' });
  if (!payload.name?.trim()) details.push({ field: 'name', message: 'Enter a name.' });
  if (details.length) throw validation(details);
  const name = payload.name.trim();
  if (universities.some((u) => u.countryId === Number(payload.countryId) && u.name.toLowerCase() === name.toLowerCase())) {
    throw conflict('That university already exists in this country.');
  }
  const uni = {
    id: nextUniId++, countryId: Number(payload.countryId), name, city: payload.city?.trim() || null,
    website: payload.website?.trim() || null, notes: payload.notes?.trim() || null, isActive: true,
  };
  universities.push(uni);
  return copy(uniOut(uni));
}

export async function updateUniversity(id, payload) {
  await delay();
  access('update');
  const uni = universities.find((u) => u.id === Number(id));
  if (!uni) throw notFound('University');
  if ('name' in payload && !payload.name?.trim()) throw validation([{ field: 'name', message: 'Enter a name.' }]);
  if ('countryId' in payload && !countryRef(payload.countryId)) throw validation([{ field: 'countryId', message: 'Choose a country.' }]);
  ['name', 'city', 'website', 'notes'].forEach((k) => {
    if (k in payload) uni[k] = payload[k]?.trim() || null;
  });
  if ('countryId' in payload) uni.countryId = Number(payload.countryId);
  if ('isActive' in payload) uni.isActive = Boolean(payload.isActive);
  return copy(uniOut(uni));
}

// ---------- programs ----------
const LEVELS = ['foundation', 'diploma', 'bachelor', 'master', 'phd', 'other'];

export async function listPrograms(params = {}) {
  await delay();
  const user = access('view');
  let rows = programs.filter(visible(user, params));
  if (params.universityId) rows = rows.filter((p) => p.universityId === Number(params.universityId));
  if (params.countryId) {
    rows = rows.filter((p) => universities.find((u) => u.id === p.universityId)?.countryId === Number(params.countryId));
  }
  if (params.level) rows = rows.filter((p) => p.level === params.level);
  if (params.q) rows = rows.filter((p) => match(p.name, params.q) || match(p.fieldOfStudy, params.q));
  return paginate(rows.sort(byName).map(programOut), params);
}

export async function createProgram(payload) {
  await delay();
  access('create');
  const details = [];
  if (!payload.universityId || !uniRef(payload.universityId)) details.push({ field: 'universityId', message: 'Choose a university.' });
  if (!payload.name?.trim()) details.push({ field: 'name', message: 'Enter a name.' });
  if (!LEVELS.includes(payload.level)) details.push({ field: 'level', message: 'Choose a level.' });
  if (details.length) throw validation(details);
  const name = payload.name.trim();
  if (programs.some((p) => p.universityId === Number(payload.universityId) && p.name.toLowerCase() === name.toLowerCase() && p.level === payload.level)) {
    throw conflict('That program already exists at this university.');
  }
  const program = {
    id: nextProgramId++, universityId: Number(payload.universityId), name, level: payload.level,
    fieldOfStudy: payload.fieldOfStudy?.trim() || null, durationMonths: payload.durationMonths ?? null,
    tuitionFee: payload.tuitionFee ?? null, currency: payload.currency?.trim().toUpperCase() || null, isActive: true,
  };
  programs.push(program);
  return copy(programOut(program));
}

export async function updateProgram(id, payload) {
  await delay();
  access('update');
  const program = programs.find((p) => p.id === Number(id));
  if (!program) throw notFound('Program');
  if ('name' in payload && !payload.name?.trim()) throw validation([{ field: 'name', message: 'Enter a name.' }]);
  if ('level' in payload && !LEVELS.includes(payload.level)) throw validation([{ field: 'level', message: 'Choose a level.' }]);
  if ('name' in payload) program.name = payload.name.trim();
  if ('level' in payload) program.level = payload.level;
  if ('fieldOfStudy' in payload) program.fieldOfStudy = payload.fieldOfStudy?.trim() || null;
  if ('durationMonths' in payload) program.durationMonths = payload.durationMonths ?? null;
  if ('tuitionFee' in payload) program.tuitionFee = payload.tuitionFee ?? null;
  if ('currency' in payload) program.currency = payload.currency?.trim().toUpperCase() || null;
  if ('universityId' in payload && uniRef(payload.universityId)) program.universityId = Number(payload.universityId);
  if ('isActive' in payload) program.isActive = Boolean(payload.isActive);
  return copy(programOut(program));
}

// ---------- intakes ----------
const TERM_ORDER = { winter: 0, spring: 1, summer: 2, fall: 3 };

export async function listIntakes(params = {}) {
  await delay();
  const user = access('view');
  let rows = intakes.filter(visible(user, params));
  const programOf = (i) => programs.find((p) => p.id === i.programId);
  const uniOf = (i) => universities.find((u) => u.id === programOf(i)?.universityId);
  if (params.programId) rows = rows.filter((i) => i.programId === Number(params.programId));
  if (params.universityId) rows = rows.filter((i) => uniOf(i)?.id === Number(params.universityId));
  if (params.countryId) rows = rows.filter((i) => uniOf(i)?.countryId === Number(params.countryId));
  if (params.year) rows = rows.filter((i) => i.year === Number(params.year));
  rows = [...rows].sort((a, b) => a.year - b.year || TERM_ORDER[a.term] - TERM_ORDER[b.term] || a.id - b.id);
  return paginate(rows.map(intakeOut), params);
}

export async function createIntake(payload) {
  await delay();
  access('create');
  const details = [];
  if (!payload.programId || !programs.some((p) => p.id === Number(payload.programId))) details.push({ field: 'programId', message: 'Choose a program.' });
  if (!['spring', 'summer', 'fall', 'winter'].includes(payload.term)) details.push({ field: 'term', message: 'Choose a term.' });
  if (!payload.year) details.push({ field: 'year', message: 'Enter a year.' });
  if (details.length) throw validation(details);
  if (intakes.some((i) => i.programId === Number(payload.programId) && i.term === payload.term && i.year === payload.year)) {
    throw conflict('That intake already exists for this program.');
  }
  const intake = {
    id: nextIntakeId++, programId: Number(payload.programId), term: payload.term, year: payload.year,
    applicationDeadline: payload.applicationDeadline ?? null, isActive: true,
  };
  intakes.push(intake);
  return copy(intakeOut(intake));
}

export async function updateIntake(id, payload) {
  await delay();
  access('update');
  const intake = intakes.find((i) => i.id === Number(id));
  if (!intake) throw notFound('Intake');
  if ('term' in payload) intake.term = payload.term;
  if ('year' in payload) intake.year = payload.year;
  if ('applicationDeadline' in payload) intake.applicationDeadline = payload.applicationDeadline ?? null;
  if ('isActive' in payload) intake.isActive = Boolean(payload.isActive);
  return copy(intakeOut(intake));
}
