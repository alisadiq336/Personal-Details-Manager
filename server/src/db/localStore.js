import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultPersonalDetailsRows } from './defaultPersonalDetails.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, '../../data');
const dataFile = path.join(dataDir, 'personal-details.json');

const columns = [
  'name',
  'email',
  'phoneNumber',
  'organization',
  'country',
  'city',
  'fullAddress',
  'cnic',
  'dateOfBirth',
  'gender',
  'notes'
];

let rowsPromise;

export async function readLocalPersonalDetails() {
  rowsPromise ??= loadRows();
  return rowsPromise;
}

export async function appendLocalPersonalDetails(rows) {
  const currentRows = await readLocalPersonalDetails();
  const now = new Date().toISOString();
  const nextId = currentRows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
  const rowsToAppend = rows.map((row, index) => ({
    id: nextId + index,
    ...row,
    createdAt: now,
    updatedAt: now
  }));

  currentRows.push(...rowsToAppend);
  await saveRows(currentRows);
  return rowsToAppend;
}

export async function updateLocalPersonalDetails(id, patch) {
  const currentRows = await readLocalPersonalDetails();
  const rowIndex = currentRows.findIndex((row) => String(row.id) === String(id));

  if (rowIndex === -1) return null;

  currentRows[rowIndex] = {
    ...currentRows[rowIndex],
    ...patch,
    id: currentRows[rowIndex].id,
    createdAt: currentRows[rowIndex].createdAt,
    updatedAt: new Date().toISOString()
  };

  await saveRows(currentRows);
  return currentRows[rowIndex];
}

export async function deleteLocalPersonalDetails(id) {
  const currentRows = await readLocalPersonalDetails();
  const nextRows = currentRows.filter((row) => String(row.id) !== String(id));

  if (nextRows.length === currentRows.length) return false;

  currentRows.splice(0, currentRows.length, ...nextRows);
  await saveRows(currentRows);
  return true;
}

async function loadRows() {
  try {
    const content = await readFile(dataFile, 'utf8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const now = new Date().toISOString();
  const seededRows = defaultPersonalDetailsRows.map((values, index) => ({
    id: index + 1,
    ...Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex] ?? null])),
    createdAt: now,
    updatedAt: now
  }));

  await saveRows(seededRows);
  return seededRows;
}

async function saveRows(rows) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(rows, null, 2)}\n`);
}
