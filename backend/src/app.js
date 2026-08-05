import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

/**
 * Builds and configures the Express application (no listening here — that lives
 * in index.js so the app can also be imported for tests).
 */
export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Friendly root.
  app.get('/', (req, res) => {
    res.json({ name: '🍿 Caramel Popcorn API', docs: '/api/health' });
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
