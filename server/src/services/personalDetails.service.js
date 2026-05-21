import { env } from '../config/env.js';
import { ObjectId } from 'mongodb';
import {
  appendLocalPersonalDetails,
  deleteLocalPersonalDetails,
  readLocalPersonalDetails,
  updateLocalPersonalDetails
} from '../db/localStore.js';
import { personalDetailsCollection } from '../db/mongo.js';

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
    return await getMongoPersonalDetails(query);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return getLocalPersonalDetails(query);
    }

    throw error;
  }
}

export async function importPersonalDetails(rows) {
  try {
    return await importMongoPersonalDetails(rows);
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
    return await updateMongoPersonalDetail(id, row);
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
    return await deleteMongoPersonalDetail(id);
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return deleteLocalPersonalDetail(id);
    }

    throw error;
  }
}

async function getMongoPersonalDetails(query) {
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
  const collection = await personalDetailsCollection();
  const filter = buildMongoFilter({ search, country, city, organization });
  const sortColumn = SORT_COLUMNS[sortBy] || SORT_COLUMNS.createdAt;
  const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;

  const [data, total, countries, cities, organizations] = await Promise.all([
    collection.find(filter).sort({ [sortColumn]: sortDirection, _id: 1 }).skip(offset).limit(limit).toArray(),
    collection.countDocuments(filter),
    collection.distinct('country'),
    collection.distinct('city'),
    collection.distinct('organization')
  ]);

  return {
    data: data.map(formatMongoRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    filters: {
      countries: uniqueSorted(countries),
      cities: uniqueSorted(cities),
      organizations: uniqueSorted(organizations)
    }
  };
}

async function importMongoPersonalDetails(rows) {
  const validRows = validateImportRows(rows);
  const collection = await personalDetailsCollection();
  const now = new Date();
  const docs = validRows.map((row) => ({
    ...row,
    dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
    createdAt: now,
    updatedAt: now
  }));
  const result = await collection.insertMany(docs);

  return {
    imported: result.insertedCount,
    skipped: rows.length - validRows.length,
    data: docs.map((doc, index) => formatMongoRow({ ...doc, _id: result.insertedIds[index] }))
  };
}

async function updateMongoPersonalDetail(id, row) {
  const objectId = parseMongoId(id);
  const collection = await personalDetailsCollection();
  const patch = normalizeImportRow(row);
  const update = {
    ...patch,
    dateOfBirth: patch.dateOfBirth ? new Date(patch.dateOfBirth) : null,
    updatedAt: new Date()
  };
  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: update },
    { returnDocument: 'after' }
  );

  if (!result) throwNotFound();

  return { data: formatMongoRow(result) };
}

async function deleteMongoPersonalDetail(id) {
  const objectId = parseMongoId(id);
  const collection = await personalDetailsCollection();
  const result = await collection.deleteOne({ _id: objectId });

  if (!result.deletedCount) throwNotFound();

  return { deleted: true };
}

function buildMongoFilter({ search, country, city, organization }) {
  const filter = {};

  if (search?.trim()) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = SEARCH_COLUMNS.map((column) => ({ [column]: searchRegex }));
  }

  for (const [column, value] of [
    ['country', country],
    ['city', city],
    ['organization', organization]
  ]) {
    if (value?.trim()) filter[column] = value.trim();
  }

  return filter;
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

function formatMongoRow(row) {
  return {
    id: row._id?.toString(),
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

function parseMongoId(id) {
  if (!ObjectId.isValid(id)) throwNotFound();
  return new ObjectId(id);
}

function shouldUseLocalId(id) {
  return !env.isProduction && !ObjectId.isValid(id);
}

function throwNotFound() {
  const error = new Error('Personal detail row was not found.');
  error.status = 404;
  throw error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldUseLocalFallback(error) {
  return !env.isProduction && (
    error?.status === 503 ||
    error?.name === 'MongoServerSelectionError' ||
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code)
  );
}
