// Builds and downloads a CSV file in the browser without any library.
// `rows` is an array of objects; `columns` is [{ header, key, format? }].
export function downloadCsv(filename, columns, rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    // Wrap in quotes if the value contains a comma, quote, or newline.
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escape(c.format ? c.format(row) : row[c.key])).join(','))
    .join('\r\n');
  const blob = new Blob([`${header}\r\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Formats today as YYYY-MM-DD for file names.
export const todayString = () => new Date().toISOString().slice(0, 10);
