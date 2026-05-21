import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import personalDetailsRoutes from './routes/personalDetails.routes.js';

export function createApp() {
  const app = express();



  app.use(helmet());
  app.use(cors({ origin: "https://personal-detail-manager.netlify.app/" }));
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({
      activeStatus: 'ok',
      error: false
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/personal-details', personalDetailsRoutes);
  app.use(errorHandler);

  return app;
}

export default createApp();

function resolveCorsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }

  if (origin === env.clientOrigin) {
    return callback(null, true);
  }

  if (/^https:\/\/[a-z0-9-]+--personal-details-manager\.netlify\.app$/.test(origin)) {
    return callback(null, true);
  }

  if (!env.isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    return callback(null, true);
  }

  return callback(new Error('Origin is not allowed by CORS.'));
}
