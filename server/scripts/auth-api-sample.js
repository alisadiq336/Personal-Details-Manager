const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

const credentials = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'change-me'
};

const signupUser = {
  username: 'new-user',
  password: 'new-user-password'
};

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

async function testLogin() {
  console.log('\nTesting login...');

  const result = await request('/auth/login', {
    method: 'POST',
    body: credentials
  });

  console.log('Status:', result.status);
  console.log('Response:', result.data);

  if (!result.ok) {
    throw new Error('Login failed. Check ADMIN_USERNAME, ADMIN_PASSWORD, and API_BASE_URL.');
  }

  return result.data.token;
}

async function testSignup() {
  console.log('\nTesting signup...');

  const result = await request('/auth/signup', {
    method: 'POST',
    body: signupUser
  });

  console.log('Status:', result.status);
  console.log('Response:', result.data);

  if (result.status === 404) {
    console.log('Signup route is not implemented yet. Add POST /api/auth/signup before using this test.');
  }
}

async function main() {
  console.log('API:', API_BASE_URL);

  const token = await testLogin();

  console.log('\nTesting protected endpoint with login token...');
  const protectedResult = await request('/personal-details', { token });
  console.log('Status:', protectedResult.status);
  console.log('Response:', protectedResult.data);

  await testSignup();
}

main().catch((error) => {
  console.error('\nTest failed:', error.message);
  process.exitCode = 1;
});
