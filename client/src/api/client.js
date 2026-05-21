const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const API_BASE_URL =
  shouldUseSameOriginApi(configuredApiBaseUrl)
    ? '/api'
    : configuredApiBaseUrl || '/api';

export async function apiRequest(path, { token, method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Cannot reach the API server. Start the backend and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}.`);
  }

  return data;
}

function shouldUseSameOriginApi(apiBaseUrl) {
  if (!apiBaseUrl || typeof window === 'undefined') return false;

  const host = window.location.hostname;
  const isLocalPage = ['localhost', '127.0.0.1'].includes(host);
  if (isLocalPage) return false;

  const isNetlifyDeployment = host === 'personal-details-manager.netlify.app' || host.endsWith('--personal-details-manager.netlify.app');
  if (!isNetlifyDeployment) return false;

  try {
    const apiUrl = new URL(apiBaseUrl, window.location.origin);
    return apiUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}
