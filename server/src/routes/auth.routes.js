import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { requireEnv } from '../config/env.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  const adminUsername = requireEnv('ADMIN_USERNAME');
  const adminPassword = requireEnv('ADMIN_PASSWORD');
  const jwtSecret = requireEnv('JWT_SECRET');

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  const token = jwt.sign({ username, role: 'admin' }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token, user: { username, role: 'admin' } });
});

export default router;
