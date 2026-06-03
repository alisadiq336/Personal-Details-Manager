import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defaultPersonalDetailsRows } from './defaultPersonalDetails.js';

const dataDir = path.basename(process.cwd()) === 'server'
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.cwd(), 'server/data');
const dataFile = path.join(dataDir, 'personal-details.json');
const isServerlessRuntime = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

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
let memoryRows;

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
  if (isServerlessRuntime) {
    memoryRows ??= createSeedRows();
    return memoryRows;
  }

  try {
    const content = await readFile(dataFile, 'utf8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const seededRows = createSeedRows();

  await saveRows(seededRows);
  return seededRows;
}

async function saveRows(rows) {
  if (isServerlessRuntime) {
    memoryRows = rows;
    return;
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(rows, null, 2)}\n`);
}

function createSeedRows() {
  const now = new Date().toISOString();
  return defaultPersonalDetailsRows.map((values, index) => ({
    id: index + 1,
    ...Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex] ?? null])),
    createdAt: now,
    updatedAt: now
  }));
}
