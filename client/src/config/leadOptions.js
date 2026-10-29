// Option lists used by lead forms, filters and tags. Values match the API contract.
export const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'gold' },
  { value: 'counseling_scheduled', label: 'Counseling scheduled', color: 'purple' },
  { value: 'converted', label: 'Converted', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'default' },
];

export const LEAD_SOURCES = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'website', label: 'Website' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'referral', label: 'Referral' },
  { value: 'event', label: 'Event' },
  { value: 'phone', label: 'Phone call' },
  { value: 'other', label: 'Other' },
];

export const TEST_STATUSES = [
  { value: 'not_taken', label: 'Not taken' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'booked', label: 'Booked' },
  { value: 'completed', label: 'Completed' },
];

export const INTAKE_TERMS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
];

// status_change entries are created by the server, so they are not offered in the form.
export const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'note', label: 'Note' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
];

export const labelOf = (options, value) => options.find((o) => o.value === value)?.label ?? value;
