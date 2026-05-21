export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (isDatabaseUnavailable(error)) {
    return res.status(503).json({
      message: 'Database is unavailable. Start MongoDB or set MONGODB_URI to a reachable MongoDB connection string.'
    });
  }

  res.status(error.status || 500).json({
    message: error.message || 'Unexpected server error.'
  });
}

function isDatabaseUnavailable(error) {
  return error?.name === 'MongoServerSelectionError' || ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error?.code);
}
