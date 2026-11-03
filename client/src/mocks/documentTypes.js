export const DOCUMENT_TYPES = [
  { id: 1, name: 'Passport', inDefaultChecklist: true },
  { id: 2, name: 'Academic Transcripts', inDefaultChecklist: true },
  { id: 3, name: 'Academic Certificates', inDefaultChecklist: true },
  { id: 4, name: 'English Test Result', inDefaultChecklist: true },
  { id: 5, name: 'Statement of Purpose (SOP)', inDefaultChecklist: true },
  { id: 6, name: 'Recommendation Letter', inDefaultChecklist: true },
  { id: 7, name: 'CV / Resume', inDefaultChecklist: true },
  { id: 8, name: 'Passport-size Photo', inDefaultChecklist: false },
  { id: 9, name: 'Financial Documents', inDefaultChecklist: false },
  { id: 10, name: 'Other', inDefaultChecklist: false },
];

export async function listDocumentTypes() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return DOCUMENT_TYPES.map((t) => ({ ...t }));
}
