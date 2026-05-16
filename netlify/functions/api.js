import serverless from 'serverless-http';
import { createApp } from '../../server/src/app.js';

const expressHandler = serverless(createApp());

export function handler(event, context) {
  return expressHandler(normalizeEventPath(event), context);
}

function normalizeEventPath(event) {
  const path = event.path || '/';
  const functionPrefix = '/.netlify/functions/api';

  if (path.startsWith(functionPrefix)) {
    const suffix = path.slice(functionPrefix.length) || '/';
    return {
      ...event,
      path: suffix.startsWith('/api') ? suffix : `/api${suffix}`
    };
  }

  return event;
}
