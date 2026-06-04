import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import createApp from '../src/app.js';
import { env } from '../src/config/env.js';

test('login succeeds with configured admin credentials', async () => {
  const response = await request(createApp())
    .post('/api/auth/login')
    .send({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })
    .expect(200);

  assert.equal(response.body.user.role, 'admin');
  assert.ok(response.body.token);
});

test('login rejects invalid credentials', async () => {
  await request(createApp())
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'wrong-password' })
    .expect(401);
});

test('personal details endpoint requires a token', async () => {
  await request(createApp()).get('/api/personal-details').expect(401);
});

test('cors accepts comma-separated configured client origins', async () => {
  const previousClientOrigin = env.clientOrigin;
  env.clientOrigin = 'https://example.netlify.app, https://app.example.com/';

  try {
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://app.example.com')
      .expect(200);

    assert.equal(response.headers['access-control-allow-origin'], 'https://app.example.com');
  } finally {
    env.clientOrigin = previousClientOrigin;
  }
});

test('favicon requests do not appear as missing API routes', async () => {
  await request(createApp()).get('/favicon.ico').expect(204);
  await request(createApp()).get('/favicon.png').expect(204);
});
