import api from './client';
import { USE_MOCK } from './mode';
import * as mock from '../mocks/files';

// GET /files/:id needs the auth header, so we fetch the file as a blob
// and hand it to the browser instead of linking to it directly.
async function fetchFileBlob(fileId) {
  if (USE_MOCK) return mock.getMockFileBlob(fileId);
  const res = await api.get(`/files/${fileId}`, { responseType: 'blob' });
  return res.data;
}

// file: { id, originalName }
export async function downloadFile(file) {
  const blob = await fetchFileBlob(file.id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.originalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
