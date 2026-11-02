// Keeps uploaded files in memory so download works in mock mode (lost on page refresh).
import { ApiError } from '../api/ApiError';

const store = new Map();
let nextFileId = 1;

export function saveMockFile(file) {
  const meta = {
    id: nextFileId++,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
  store.set(meta.id, { blob: file, meta });
  return { ...meta };
}

// Placeholder file for seeded checklist items.
export function seedMockFile(name, mimeType = 'application/pdf') {
  const blob = new Blob([`Sample document: ${name}`], { type: 'text/plain' });
  const meta = { id: nextFileId++, originalName: name, mimeType, sizeBytes: blob.size };
  store.set(meta.id, { blob, meta });
  return { ...meta };
}

export async function getMockFileBlob(id) {
  const entry = store.get(Number(id));
  if (!entry) throw new ApiError(404, 'NOT_FOUND', 'File not found.');
  return entry.blob;
}
