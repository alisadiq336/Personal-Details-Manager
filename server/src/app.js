import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import personalDetailsRoutes from './routes/personalDetails.routes.js';

function createApp() {
  const app = express();



  app.use(helmet());
  app.use(cors({ origin: resolveCorsOrigin }));
  app.use(express.json());

  app.get('/',  (_req, res) => {
    res.json({ activeStatus: 'ok', error: false });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(['/favicon.ico', '/favicon.png'], (_req, res) => {
    res.status(204).end();
  });

  app.use('/api/auth', resolveExpressHandler(authRoutes, 'auth routes'));
  app.use('/api/personal-details', resolveExpressHandler(personalDetailsRoutes, 'personal details routes'));
  app.use(resolveExpressHandler(errorHandler, 'error handler'));

  return app;
}

export default createApp;

function resolveCorsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }

  if (resolveAllowedOrigins().includes(normalizeOrigin(origin))) {
    return callback(null, true);
  }

  if (/^https:\/\/personal-details?-manager\.netlify\.app$/.test(origin)) {
    return callback(null, true);
  }

  if (/^https:\/\/[a-z0-9-]+--personal-details?-manager\.netlify\.app$/.test(origin)) {
    return callback(null, true);
  }

  if (/^https:\/\/personal-details?-manager(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
    return callback(null, true);
  }

  if (!env.isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Origin is not allowed by CORS.'));
}

function resolveAllowedOrigins() {
  return String(env.clientOrigin || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function resolveExpressHandler(handler, label) {
  const resolvedHandler = typeof handler === 'function' ? handler : handler?.default;

  if (typeof resolvedHandler !== 'function') {
    throw new TypeError(`${label} did not resolve to an Express handler.`);
  }

  return resolvedHandler;
}
