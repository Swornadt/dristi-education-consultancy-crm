export const APPLICATION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'offer', label: 'Offer received', color: 'purple' },
  { value: 'accepted', label: 'Accepted', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
];

// Allowed moves, as in the API contract. Anything else is rejected with 409.
export const STATUS_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['offer', 'rejected'],
  offer: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

// Button text for moving an application into each status.
export const STATUS_ACTIONS = {
  submitted: 'Mark as submitted',
  offer: 'Record offer',
  accepted: 'Offer accepted',
  rejected: 'Mark as rejected',
};

export const PROGRAM_LEVELS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'master', label: 'Master' },
  { value: 'phd', label: 'PhD' },
  { value: 'other', label: 'Other' },
];
