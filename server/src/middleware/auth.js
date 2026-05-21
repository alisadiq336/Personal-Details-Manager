import jwt from 'jsonwebtoken';
import { requireEnv } from '../config/env.js';

export function requireAuth(req, res, next) {
  const header = req.get('authorization');

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  const token = header.slice('Bearer '.length);

  try {
    req.user = jwt.verify(token, requireEnv('JWT_SECRET'));
    return next();
  } catch (error) {
    if (error.status) {
      return next(error);
    }

    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}
