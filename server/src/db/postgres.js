import pg from 'pg';
import { requireEnv } from '../config/env.js';
import { defaultPersonalDetailsRows } from './defaultPersonalDetails.js';

const { Pool } = pg;
const tableName = '"personalDetails"';
const seedColumns = [
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

let pool;
let poolPromise;

export async function postgresQuery(text, params = []) {
  const currentPool = await personalDetailsPool();
  return currentPool.query(text, params);
}

export async function getPostgresClient() {
  const currentPool = await personalDetailsPool();
  return currentPool.connect();
}

export async function closePostgres() {
  await pool?.end();
  pool = undefined;
  poolPromise = undefined;
}

async function personalDetailsPool() {
  poolPromise ??= connect().catch((error) => {
    poolPromise = undefined;
    throw error;
  });

  return poolPromise;
}

async function connect() {
  pool = new Pool({
    connectionString: requireEnv('DATABASE_URL'),
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000
  });

  await pool.query('SELECT 1');
  await createSchema();
  await seedDefaultRows();

  return pool;
}

async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id BIGSERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      "phoneNumber" TEXT,
      organization TEXT,
      country TEXT,
      city TEXT,
      "fullAddress" TEXT,
      cnic TEXT,
      "dateOfBirth" DATE,
      gender TEXT,
      notes TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await Promise.all([
    pool.query(`CREATE INDEX IF NOT EXISTS personal_details_name_idx ON ${tableName} (name)`),
    pool.query(`CREATE INDEX IF NOT EXISTS personal_details_email_idx ON ${tableName} (email)`),
    pool.query(`CREATE INDEX IF NOT EXISTS personal_details_country_idx ON ${tableName} (country)`),
    pool.query(`CREATE INDEX IF NOT EXISTS personal_details_city_idx ON ${tableName} (city)`),
    pool.query(`CREATE INDEX IF NOT EXISTS personal_details_organization_idx ON ${tableName} (organization)`),
    pool.query(`CREATE INDEX IF NOT EXISTS personal_details_created_at_idx ON ${tableName} ("createdAt" DESC)`)
  ]);
}

async function seedDefaultRows() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${tableName}`);
  if (rows[0].total > 0) return;
  if (!defaultPersonalDetailsRows.length) return;

  const now = new Date();
  const values = [];
  const placeholders = defaultPersonalDetailsRows.map((row, rowIndex) => {
    const rowValues = seedColumns.map((column, columnIndex) => cleanSeedValue(column, row[columnIndex]));
    rowValues.push(now, now);
    values.push(...rowValues);

    const offset = rowIndex * (seedColumns.length + 2);
    return `(${rowValues.map((_, index) => `$${offset + index + 1}`).join(', ')})`;
  });

  await pool.query(`
    INSERT INTO ${tableName} (${seedColumns.map(quoteIdentifier).join(', ')}, "createdAt", "updatedAt")
    VALUES ${placeholders.join(', ')}
  `, values);
}

function cleanSeedValue(column, value) {
  if (column === 'dateOfBirth' && value) return new Date(value).toISOString().slice(0, 10);
  return value ?? null;
}

function quoteIdentifier(identifier) {
  return /^[a-z][a-z0-9_]*$/.test(identifier) ? identifier : `"${identifier}"`;
}
