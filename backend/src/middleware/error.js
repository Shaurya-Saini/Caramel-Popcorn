import { isProd } from '../config/index.js';

/**
 * 404 handler — reached when no route matched.
 */
export function notFound(req, res, next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Central error handler. Express 5 forwards rejected async handlers here
 * automatically, so route handlers can simply `throw`.
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    error: err.name || 'Error',
    message: err.message || 'Something went wrong',
    ...(isProd ? {} : { stack: err.stack }),
  });
}
