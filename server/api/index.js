let appPromise;

export default async function handler(req, res) {
  try {
    if (handleSmokeTestRequest(req, res)) return;

    const app = await getApp();
    app(req, res);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: 'Unexpected server error.' }));
  }
}

async function getApp() {
  appPromise ??= import('../src/app.js').then(({ default: createApp }) => createApp());
  return appPromise;
}

function handleSmokeTestRequest(req, res) {
  if (req.method !== 'GET') return false;

  const urlObj = new URL(req.url || '/', 'https://personal-details-manager-server.vercel.app');
  let pathname = urlObj.pathname;

  // Normalize pathname: remove trailing slash (except for '/')
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Broad match for root/index requests
  if (['/', '/api', '/api/index', '/api/index.js', '/index.js'].includes(pathname)) {
    return sendJson(res, 200, { activeStatus: 'ok', error: false });
  }

  if (pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (['/favicon.ico', '/favicon.png', '/api/favicon.ico', '/api/favicon.png'].includes(pathname)) {
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
