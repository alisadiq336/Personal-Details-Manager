import * as XLSX from 'xlsx';

export const importColumns = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['phoneNumber', 'Phone Number'],
  ['organization', 'Organization'],
  ['country', 'Country'],
  ['city', 'City'],
  ['fullAddress', 'Full Address'],
  ['cnic', 'CNIC'],
  ['dateOfBirth', 'Date of Birth'],
  ['gender', 'Gender'],
  ['notes', 'Notes']
];

const headerAliases = new Map([
  ['name', 'name'],
  ['full name', 'name'],
  ['person name', 'name'],
  ['email', 'email'],
  ['email address', 'email'],
  ['phone', 'phoneNumber'],
  ['phone number', 'phoneNumber'],
  ['mobile', 'phoneNumber'],
  ['mobile number', 'phoneNumber'],
  ['organization', 'organization'],
  ['organisation', 'organization'],
  ['company', 'organization'],
  ['country', 'country'],
  ['city', 'city'],
  ['address', 'fullAddress'],
  ['full address', 'fullAddress'],
  ['cnic', 'cnic'],
  ['national id', 'cnic'],
  ['date of birth', 'dateOfBirth'],
  ['dob', 'dateOfBirth'],
  ['birth date', 'dateOfBirth'],
  ['gender', 'gender'],
  ['notes', 'notes'],
  ['note', 'notes']
]);

export async function importRowsFromFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) return [];

  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
  return rawRows
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => String(value).trim()));
}

function normalizeRow(rawRow) {
  const row = Object.fromEntries(importColumns.map(([key]) => [key, '']));

  for (const [rawKey, value] of Object.entries(rawRow)) {
    const normalizedKey = normalizeHeader(rawKey);
    const targetKey = headerAliases.get(normalizedKey);
    if (targetKey) row[targetKey] = formatValue(value, targetKey);
  }

  return row;
}

function normalizeHeader(header) {
  return String(header)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatValue(value, key) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (key === 'dateOfBirth') {
    const parsed = typeof value === 'number' ? XLSX.SSF.parse_date_code(value) : null;
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return String(value).trim();
}
