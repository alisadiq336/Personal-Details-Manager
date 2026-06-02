import * as XLSX from 'xlsx';

const columns = [
  ['Name', 'name'],
  ['Email', 'email'],
  ['Phone Number', 'phoneNumber'],
  ['Organization', 'organization'],
  ['Country', 'country'],
  ['City', 'city'],
  ['Full Address', 'fullAddress'],
  ['CNIC', 'cnic'],
  ['Date of Birth', 'dateOfBirth'],
  ['Gender', 'gender'],
  ['Notes', 'notes']
];

export function exportRows(rows, filename = 'personal-details-visible.xlsx') {
  const formatted = rows.map((row) => Object.fromEntries(
    columns.map(([label, key]) => [label, row[key] || ''])
  ));
  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Personal Details');
  XLSX.writeFile(workbook, filename);
}

export function exportVisibleRows(rows) {
  exportRows(rows);
}

export function exportCsvRows(rows, filename = 'personal-details.csv') {
  const formatted = rows.map((row) => columns.map(([, key]) => row[key] || ''));
  const header = columns.map(([label]) => label);
  const csv = [header, ...formatted]
    .map((line) => line.map(escapeCsvValue).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function printRows(rows, title = 'Personal Details') {
  const printable = window.open('', '_blank', 'width=1200,height=800');
  if (!printable) return;

  const tableRows = rows.map((row) => `
    <tr>${columns.map(([, key]) => `<td>${escapeHtml(row[key] || '')}</td>`).join('')}</tr>
  `).join('');

  printable.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { font-size: 22px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead><tr>${columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printable.document.close();
  printable.focus();
  printable.print();
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
