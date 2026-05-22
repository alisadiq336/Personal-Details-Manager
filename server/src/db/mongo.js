import { MongoClient } from 'mongodb';
import { env, requireEnv } from '../config/env.js';
import { defaultPersonalDetailsRows } from './defaultPersonalDetails.js';

const collectionName = 'personalDetails';
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

let client;
let collectionPromise;

export async function personalDetailsCollection() {
  collectionPromise ??= connect().catch((error) => {
    collectionPromise = undefined;
    throw error;
  });
  return collectionPromise;
}

export async function closeMongo() {
  await client?.close();
  client = undefined;
  collectionPromise = undefined;
}

async function connect() {
  client = new MongoClient(requireEnv('MONGODB_URI'), {
    serverSelectionTimeoutMS: 10000
  });

  await client.connect();
  const db = client.db(env.mongodbDb);
  const collection = db.collection(collectionName);

  await collection.createIndexes([
    { key: { name: 1 } },
    { key: { email: 1 } },
    { key: { country: 1 } },
    { key: { city: 1 } },
    { key: { organization: 1 } },
    { key: { createdAt: -1 } }
  ]);
  await seedDefaultRows(collection);

  return collection;
}

async function seedDefaultRows(collection) {
  const total = await collection.countDocuments();
  if (total > 0) return;

  const now = new Date();
  await collection.insertMany(defaultPersonalDetailsRows.map((values) => ({
    ...Object.fromEntries(seedColumns.map((column, index) => [column, cleanSeedValue(column, values[index])])),
    createdAt: now,
    updatedAt: now
  })));
}

function cleanSeedValue(column, value) {
  if (column === 'dateOfBirth' && value) return new Date(value);
  return value ?? null;
}
