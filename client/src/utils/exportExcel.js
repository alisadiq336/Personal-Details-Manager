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
