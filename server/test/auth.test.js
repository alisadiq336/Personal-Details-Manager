import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

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
