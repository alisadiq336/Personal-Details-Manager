export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (isDatabaseUnavailable(error)) {
    return res.status(503).json({
      message: 'Database is unavailable. Start PostgreSQL or set DATABASE_URL to a reachable PostgreSQL connection string.'
    });
  }

  res.status(error.status || 500).json({
    message: error.message || 'Unexpected server error.'
  });
}

function isDatabaseUnavailable(error) {
  return ['Connection terminated unexpectedly', 'Connection terminated'].includes(error?.message) ||
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code);
}
