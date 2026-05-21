import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(dirname, '../../../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config();

export const env = {
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  mongodbDb: process.env.MONGODB_DB || 'personal_details_manager',
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production'
};

export function requireEnv(key) {
  const value = process.env[key];

  if (!value) {
    const error = new Error(`Missing required environment variable: ${key}`);
    error.status = 503;
    throw error;
  }

  return value;
}
