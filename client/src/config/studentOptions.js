const toOptions = (values) => values.map((v) => ({ value: v, label: v }));

export const GENDERS = toOptions(['Female', 'Male', 'Other', 'Prefer not to say']);
export const EDUCATION_LEVELS = toOptions(['High School', 'Diploma', 'Bachelor', 'Master', 'Other']);
export const TEST_NAMES = toOptions(['IELTS', 'TOEFL', 'PTE', 'Duolingo', 'SAT', 'ACT', 'GRE', 'GMAT', 'Other']);

// English tests that have four section scores.
export const SECTION_TESTS = ['IELTS', 'TOEFL', 'PTE'];
export const SECTIONS = [
  { key: 'listening', label: 'Listening', short: 'L' },
  { key: 'reading', label: 'Reading', short: 'R' },
  { key: 'writing', label: 'Writing', short: 'W' },
  { key: 'speaking', label: 'Speaking', short: 'S' },
];

// Allowed range for each test's overall score (used to limit the number inputs).
export const TEST_RANGES = {
  IELTS: { min: 0, max: 9, step: 0.5 },
  TOEFL: { min: 0, max: 120, step: 1 },
  PTE: { min: 10, max: 90, step: 1 },
  Duolingo: { min: 10, max: 160, step: 5 },
  SAT: { min: 400, max: 1600, step: 10 },
  ACT: { min: 1, max: 36, step: 1 },
  GRE: { min: 260, max: 340, step: 1 },
  GMAT: { min: 205, max: 805, step: 5 },
  Other: { min: 0, max: 1000, step: 0.5 },
};
export const SECTION_RANGES = {
  IELTS: { min: 0, max: 9, step: 0.5 },
  TOEFL: { min: 0, max: 30, step: 1 },
  PTE: { min: 10, max: 90, step: 1 },
};

export const DOC_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'default' },
  { value: 'received', label: 'Received', color: 'blue' },
  { value: 'verified', label: 'Verified', color: 'green' },
];

export const MAX_UPLOAD_MB = 10;
export const ALLOWED_UPLOAD_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(',');
