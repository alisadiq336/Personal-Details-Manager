import { env } from '../config/env.js';
import {
  appendLocalPersonalDetails,
  deleteLocalPersonalDetails,
  readLocalPersonalDetails,
  updateLocalPersonalDetails
} from '../db/localStore.js';
import { getPostgresClient, postgresQuery } from '../db/postgres.js';

const SORT_COLUMNS = {
  name: 'name',
  email: 'email',
  phoneNumber: 'phoneNumber',
  organization: 'organization',
  country: 'country',
  city: 'city',
  cnic: 'cnic',
  createdAt: 'createdAt'
};

const SEARCH_COLUMNS = [
  'name',
  'email',
  'phoneNumber',
  'organization',
  'country',
  'city',
  'fullAddress',
  'cnic'
];

const IMPORT_COLUMNS = [
  ['name', 'name'],
  ['email', 'email'],
  ['phoneNumber', 'phoneNumber'],
  ['organization', 'organization'],
  ['country', 'country'],
  ['city', 'city'],
  ['fullAddress', 'fullAddress'],
  ['cnic', 'cnic'],
  ['dateOfBirth', 'dateOfBirth'],
  ['gender', 'gender'],
  ['notes', 'notes']
];

export async function getPersonalDetails(query) {
  try {
    return await getPostgresPersonalDetails(query);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return getLocalPersonalDetails(query);
    }

    throw error;
  }
}

export async function importPersonalDetails(rows) {
  try {
    return await importPostgresPersonalDetails(rows);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return importLocalPersonalDetails(rows);
    }

    throw error;
  }
}

export async function updatePersonalDetail(id, row) {
  if (shouldUseLocalId(id)) {
    return updateLocalPersonalDetail(id, row);
  }

  try {
    return await updatePostgresPersonalDetail(id, row);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return updateLocalPersonalDetail(id, row);
    }

    throw error;
  }
}

export async function deletePersonalDetail(id) {
  if (shouldUseLocalId(id)) {
    return deleteLocalPersonalDetail(id);
  }

  try {
    return await deletePostgresPersonalDetail(id);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return deleteLocalPersonalDetail(id);
    }

    throw error;
  }
}

async function getPostgresPersonalDetails(query) {
  const {
    search,
    country,
    city,
    organization,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '10', 10), 1), 100);
  const offset = (page - 1) * limit;
  const filter = buildPostgresFilter({ search, country, city, organization });
  const sortColumn = SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt;
  const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const limitParam = filter.params.length + 1;
  const offsetParam = filter.params.length + 2;

  const [data, total, countries, cities, organizations] = await Promise.all([
    postgresQuery(`
      SELECT id, name, email, "phoneNumber", organization, country, city, "fullAddress",
        cnic, "dateOfBirth", gender, notes, "createdAt", "updatedAt"
      FROM "personalDetails"
      ${filter.where}
      ORDER BY ${quoteColumn(sortColumn)} ${sortDirection}, id ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, [...filter.params, limit, offset]),
    postgresQuery(`SELECT COUNT(*)::int AS total FROM "personalDetails" ${filter.where}`, filter.params),
    selectDistinctFilter('country'),
    selectDistinctFilter('city'),
    selectDistinctFilter('organization')
  ]);

  return {
    data: data.rows.map(formatPostgresRow),
    pagination: {
      page,
      limit,
      total: total.rows[0].total,
      totalPages: Math.ceil(total.rows[0].total / limit)
    },
    filters: {
      countries: countries.rows.map((row) => row.value),
      cities: cities.rows.map((row) => row.value),
      organizations: organizations.rows.map((row) => row.value)
    }
  };
}

async function importPostgresPersonalDetails(rows) {
  const validRows = validateImportRows(rows);
  const client = await getPostgresClient();
  const now = new Date();
  const docs = validRows.map((row) => ({
    ...row,
    dateOfBirth: row.dateOfBirth || null,
    createdAt: now,
    updatedAt: now
  }));

  try {
    await client.query('BEGIN');
    const insertedRows = [];

    for (const doc of docs) {
      const result = await client.query(`
        INSERT INTO "personalDetails" (
          name, email, "phoneNumber", organization, country, city, "fullAddress",
          cnic, "dateOfBirth", gender, notes, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, name, email, "phoneNumber", organization, country, city, "fullAddress",
          cnic, "dateOfBirth", gender, notes, "createdAt", "updatedAt"
      `, [
        doc.name,
        doc.email,
        doc.phoneNumber,
        doc.organization,
        doc.country,
        doc.city,
        doc.fullAddress,
        doc.cnic,
        doc.dateOfBirth,
        doc.gender,
        doc.notes,
        doc.createdAt,
        doc.updatedAt
      ]);

      insertedRows.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return {
      imported: insertedRows.length,
      skipped: rows.length - validRows.length,
      data: insertedRows.map(formatPostgresRow)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updatePostgresPersonalDetail(id, row) {
  const rowId = parsePostgresId(id);
  const patch = normalizeImportRow(row);
  const result = await postgresQuery(`
    UPDATE "personalDetails"
    SET name = $1,
      email = $2,
      "phoneNumber" = $3,
      organization = $4,
      country = $5,
      city = $6,
      "fullAddress" = $7,
      cnic = $8,
      "dateOfBirth" = $9,
      gender = $10,
      notes = $11,
      "updatedAt" = $12
    WHERE id = $13
    RETURNING id, name, email, "phoneNumber", organization, country, city, "fullAddress",
      cnic, "dateOfBirth", gender, notes, "createdAt", "updatedAt"
  `, [
    patch.name,
    patch.email,
    patch.phoneNumber,
    patch.organization,
    patch.country,
    patch.city,
    patch.fullAddress,
    patch.cnic,
    patch.dateOfBirth || null,
    patch.gender,
    patch.notes,
    new Date(),
    rowId
  ]);

  if (!result.rowCount) throwNotFound();

  return { data: formatPostgresRow(result.rows[0]) };
}

async function deletePostgresPersonalDetail(id) {
  const rowId = parsePostgresId(id);
  const result = await postgresQuery('DELETE FROM "personalDetails" WHERE id = $1', [rowId]);

  if (!result.rowCount) throwNotFound();

  return { deleted: true };
}

function buildPostgresFilter({ search, country, city, organization }) {
  const conditions = [];
  const params = [];

  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    const searchParam = `$${params.length}`;
    conditions.push(`(${SEARCH_COLUMNS.map((column) => `${quoteColumn(column)} ILIKE ${searchParam}`).join(' OR ')})`);
  }

  for (const [column, value] of [
    ['country', country],
    ['city', city],
    ['organization', organization]
  ]) {
    if (value?.trim()) {
      params.push(value.trim());
      conditions.push(`${quoteColumn(column)} = $${params.length}`);
    }
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function validateImportRows(rows) {
  if (!Array.isArray(rows)) {
    const error = new Error('Rows must be an array.');
    error.status = 400;
    throw error;
  }

  const normalizedRows = rows.map(normalizeImportRow);
  const validRows = normalizedRows.filter((row) => row.name && row.email && row.phoneNumber);

  if (!validRows.length) {
    const error = new Error('Import requires at least one row with name, email, and phone number.');
    error.status = 400;
    throw error;
  }

  return validRows;
}

function normalizeImportRow(row) {
  return Object.fromEntries(
    IMPORT_COLUMNS.map(([key]) => [key, cleanValue(row?.[key], key)])
  );
}

async function getLocalPersonalDetails(query) {
  const {
    search,
    country,
    city,
    organization,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '10', 10), 1), 100);
  const offset = (page - 1) * limit;
  const orderDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
  const rows = await readLocalPersonalDetails();
  const filteredRows = rows
    .filter((row) => matchesSearch(row, search))
    .filter((row) => !country?.trim() || row.country === country.trim())
    .filter((row) => !city?.trim() || row.city === city.trim())
    .filter((row) => !organization?.trim() || row.organization === organization.trim())
    .sort((left, right) => compareValues(left[sortBy], right[sortBy]) * orderDirection || compareValues(left.id, right.id));

  return {
    data: filteredRows.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total: filteredRows.length,
      totalPages: Math.ceil(filteredRows.length / limit)
    },
    filters: buildLocalFilters(rows)
  };
}

async function importLocalPersonalDetails(rows) {
  const validRows = validateImportRows(rows);
  const data = await appendLocalPersonalDetails(validRows);

  return {
    imported: data.length,
    skipped: rows.length - validRows.length,
    data
  };
}

async function updateLocalPersonalDetail(id, row) {
  const patch = normalizeImportRow(row);
  const updated = await updateLocalPersonalDetails(id, patch);

  if (!updated) throwNotFound();

  return { data: updated };
}

async function deleteLocalPersonalDetail(id) {
  const deleted = await deleteLocalPersonalDetails(id);

  if (!deleted) throwNotFound();

  return { deleted: true };
}

function formatPostgresRow(row) {
  return {
    id: row.id?.toString(),
    name: row.name,
    email: row.email,
    phoneNumber: row.phoneNumber,
    organization: row.organization,
    country: row.country,
    city: row.city,
    fullAddress: row.fullAddress,
    cnic: row.cnic,
    dateOfBirth: formatDate(row.dateOfBirth),
    gender: row.gender,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function matchesSearch(row, search) {
  const searchText = search?.trim().toLowerCase();
  if (!searchText) return true;

  return SEARCH_COLUMNS.some((column) => String(row[column] || '').toLowerCase().includes(searchText));
}

function buildLocalFilters(rows) {
  return {
    countries: uniqueSorted(rows.map((row) => row.country)),
    cities: uniqueSorted(rows.map((row) => row.city)),
    organizations: uniqueSorted(rows.map((row) => row.organization))
  };
}

function selectDistinctFilter(column) {
  const quotedColumn = quoteColumn(column);
  return postgresQuery(`
    SELECT DISTINCT ${quotedColumn} AS value
    FROM "personalDetails"
    WHERE ${quotedColumn} IS NOT NULL AND ${quotedColumn} <> ''
    ORDER BY ${quotedColumn}
  `);
}

function quoteColumn(column) {
  return /^[a-z][a-z0-9_]*$/.test(column) ? column : `"${column}"`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => String(left).localeCompare(String(right)));
}

function compareValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

function cleanValue(value, key) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (key === 'dateOfBirth') return normalizeDate(text);
  return text;
}

function normalizeDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function parsePostgresId(id) {
  if (!isValidPostgresId(id)) throwNotFound();
  return id;
}

function shouldUseLocalId(id) {
  return !isPersistentDatabaseRequired() && !isValidPostgresId(id);
}

function throwNotFound() {
  const error = new Error('Personal detail row was not found.');
  error.status = 404;
  throw error;
}

function isValidPostgresId(id) {
  return /^[1-9]\d*$/.test(String(id));
}

function shouldUseLocalFallback(error) {
  return !isPersistentDatabaseRequired() && (
    error?.status === 503 ||
    ['Connection terminated unexpectedly', 'Connection terminated'].includes(error?.message) ||
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code)
  );
}

function isPersistentDatabaseRequired() {
  return Boolean(env.databaseUrl);
}
