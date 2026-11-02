import { ALLOWED_UPLOAD_EXTENSIONS, MAX_UPLOAD_MB } from '../config/studentOptions';

export function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns an error message, or null when the file is fine. Mirrors the server limits.
export function validateUpload(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
    return 'Only PDF, JPG, PNG and DOCX files are allowed.';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Files must be ${MAX_UPLOAD_MB} MB or smaller.`;
  }
  return null;
}
