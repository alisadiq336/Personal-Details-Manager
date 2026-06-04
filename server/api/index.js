import createApp from '../src/app.js';

const app = createApp();

export default function handler(req, res) {
  try {
    if (handleSmokeTestRequest(req, res)) return;

    app(req, res);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: 'Unexpected server error.' }));
  }
}

function handleSmokeTestRequest(req, res) {
  if (req.method !== 'GET') return false;

  const pathname = new URL(req.url || '/', 'https://personal-details-manager-server.vercel.app').pathname;

  if (['/', '/api'].includes(pathname)) {
    return sendJson(res, 200, { activeStatus: 'ok', error: false });
  }

  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (['/favicon.ico', '/favicon.png'].includes(pathname)) {
    res.statusCode = 204;
    res.end();
    return true;
  }

  return false;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
  return true;
}
