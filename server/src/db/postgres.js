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
