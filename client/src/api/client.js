const API_BASE_URL = resolveApiBaseUrl();

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredUrl) {
    return '/api';
  }

  if (typeof window === 'undefined') {
    return configuredUrl;
  }

  const currentHost = window.location.hostname;

  if (currentHost.endsWith('.netlify.app')) {
    return '/api';
  }

  return configuredUrl;
}

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
    throw new Error('Cannot reach the API server. Check the API deployment and try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}.`);
  }

  return data;
}
