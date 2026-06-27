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
  'notes',
  'ngoId',
  'fathersName',
  'bloodGroup',
  'languagesKnown',
  'profilePicture',
  'countryOfAssignment',
  'homeCountry',
  'organizationType',
  'parentOrganization',
  'subOrganization',
  'department',
  'designation',
  'dutyStation',
  'currentLocation',
  'employmentType',
  'joiningDate',
  'contractExpiryDate',
  'workStatus',
  'reportingOfficer',
  'officialPhone1',
  'officialPhone2',
  'officialEmail1',
  'officialEmail2',
  'personalEmail1',
  'mobileNo1',
  'mobileNo2',
  'presentAddress',
  'permanentAddress',
  'emergencyContactName',
  'emergencyContactRelationship',
  'emergencyContactNumber',
  'nationalIdNumber',
  'governmentIdType',
  'governmentIdNumber',
  'panNumber',
  'passportNumber',
  'passportIssuingCountry',
  'passportIssueDate',
  'passportExpiryDate',
  'visaType',
  'visaNumber',
  'visaExpiryDate',
  'workPermitNumber',
  'workPermitExpiryDate',
  'bankName',
  'accountTitle',
  'accountNumber',
  'iban',
  'swiftCode',
  'branchName',
  'salaryCurrency',
  'taxIdNumber',
  'paymentMethod',
  'spouseName',
  'spouseOccupation',
  'numberOfDependents',
  'dependent1Name',
  'dependent1Relationship',
  'dependent2Name',
  'dependent2Relationship',
  'relationWithOfficials',
  'linkedInId',
  'facebookId',
  'twitterId',
  'instagramId',
  'telegramId',
  'skypeId',
  'whatsAppNumber',
  'signalNumber',
  'microsoftTeamsId',
  'otherSocialMediaId',
  'socialMediaAccountType',
  'verificationStatus',
  'remarks',
  'recordDate',
  'recordCreatedBy',
  'recordCreatedDate',
  'recordLastUpdatedBy',
  'recordLastUpdatedDate',
  'recordVerificationStatus',
  'comments'
];

const INITIAL_CONNECT_TIMEOUT_MS = 10000;

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
  await pool?.end().catch(() => {});
  pool = undefined;
  poolPromise = undefined;
}

async function personalDetailsPool() {
  poolPromise ??= connect().catch(async (error) => {
    // Make sure we don't hang onto a half-initialized pool on failure,
    // so the next request gets a clean retry instead of reusing a broken one.
    await pool?.end().catch(() => {});
    pool = undefined;
    poolPromise = undefined;
    throw error;
  });

  return poolPromise;
}

async function connect() {
  pool = new Pool({
    connectionString: requireEnv('DATABASE_URL'),
    ssl: resolveSslConfig(),
    connectionTimeoutMillis: INITIAL_CONNECT_TIMEOUT_MS,
    // Serverless-friendly pool sizing: one connection per function
    // invocation, released quickly when idle instead of held open.
    max: 1,
    idleTimeoutMillis: 10000
  });

  // Guard the very first round trip with an explicit timeout. Some
  // network failures (wrong host, DB not reachable, SSL negotiation
  // stalls) are not reliably caught by connectionTimeoutMillis alone
  // and can otherwise hang until the platform's own timeout kills
  // the whole function (e.g. Vercel's 300s limit).
  await withTimeout(
    pool.query('SELECT 1'),
    INITIAL_CONNECT_TIMEOUT_MS,
    'Could not establish an initial database connection in time. Check DATABASE_URL, network access, and SSL settings.'
  );

  await createSchema();
  await seedDefaultRows();

  return pool;
}

function resolveSslConfig() {
  // Explicitly disabled -> no SSL.
  if (process.env.PGSSLMODE === 'disable') return undefined;

  // Most managed Postgres providers (Neon, Supabase, Render, RDS, etc.)
  // require SSL even when PGSSLMODE isn't set, so default to enabling it
  // unless explicitly turned off above. Adjust if your DB truly has no SSL.
  return { rejectUnauthorized: false };
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

  const columnsToAdd = [
    ['ngoId', 'TEXT'],
    ['fathersName', 'TEXT'],
    ['bloodGroup', 'TEXT'],
    ['languagesKnown', 'TEXT'],
    ['profilePicture', 'TEXT'],
    ['countryOfAssignment', 'TEXT'],
    ['homeCountry', 'TEXT'],
    ['organizationType', 'TEXT'],
    ['parentOrganization', 'TEXT'],
    ['subOrganization', 'TEXT'],
    ['department', 'TEXT'],
    ['designation', 'TEXT'],
    ['dutyStation', 'TEXT'],
    ['currentLocation', 'TEXT'],
    ['employmentType', 'TEXT'],
    ['joiningDate', 'DATE'],
    ['contractExpiryDate', 'DATE'],
    ['workStatus', 'TEXT'],
    ['reportingOfficer', 'TEXT'],
    ['officialPhone1', 'TEXT'],
    ['officialPhone2', 'TEXT'],
    ['officialEmail1', 'TEXT'],
    ['officialEmail2', 'TEXT'],
    ['personalEmail1', 'TEXT'],
    ['mobileNo1', 'TEXT'],
    ['mobileNo2', 'TEXT'],
    ['presentAddress', 'TEXT'],
    ['permanentAddress', 'TEXT'],
    ['emergencyContactName', 'TEXT'],
    ['emergencyContactRelationship', 'TEXT'],
    ['emergencyContactNumber', 'TEXT'],
    ['nationalIdNumber', 'TEXT'],
    ['governmentIdType', 'TEXT'],
    ['governmentIdNumber', 'TEXT'],
    ['panNumber', 'TEXT'],
    ['passportNumber', 'TEXT'],
    ['passportIssuingCountry', 'TEXT'],
    ['passportIssueDate', 'DATE'],
    ['passportExpiryDate', 'DATE'],
    ['visaType', 'TEXT'],
    ['visaNumber', 'TEXT'],
    ['visaExpiryDate', 'DATE'],
    ['workPermitNumber', 'TEXT'],
    ['workPermitExpiryDate', 'DATE'],
    ['bankName', 'TEXT'],
    ['accountTitle', 'TEXT'],
    ['accountNumber', 'TEXT'],
    ['iban', 'TEXT'],
    ['swiftCode', 'TEXT'],
    ['branchName', 'TEXT'],
    ['salaryCurrency', 'TEXT'],
    ['taxIdNumber', 'TEXT'],
    ['paymentMethod', 'TEXT'],
    ['spouseName', 'TEXT'],
    ['spouseOccupation', 'TEXT'],
    ['numberOfDependents', 'INTEGER'],
    ['dependent1Name', 'TEXT'],
    ['dependent1Relationship', 'TEXT'],
    ['dependent2Name', 'TEXT'],
    ['dependent2Relationship', 'TEXT'],
    ['relationWithOfficials', 'TEXT'],
    ['linkedInId', 'TEXT'],
    ['facebookId', 'TEXT'],
    ['twitterId', 'TEXT'],
    ['instagramId', 'TEXT'],
    ['telegramId', 'TEXT'],
    ['skypeId', 'TEXT'],
    ['whatsAppNumber', 'TEXT'],
    ['signalNumber', 'TEXT'],
    ['microsoftTeamsId', 'TEXT'],
    ['otherSocialMediaId', 'TEXT'],
    ['socialMediaAccountType', 'TEXT'],
    ['verificationStatus', 'TEXT'],
    ['remarks', 'TEXT'],
    ['recordDate', 'DATE'],
    ['recordCreatedBy', 'TEXT'],
    ['recordCreatedDate', 'DATE'],
    ['recordLastUpdatedBy', 'TEXT'],
    ['recordLastUpdatedDate', 'DATE'],
    ['recordVerificationStatus', 'TEXT'],
    ['comments', 'TEXT']
  ];

  for (const [colName, colType] of columnsToAdd) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${colName}" ${colType}`);
  }

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