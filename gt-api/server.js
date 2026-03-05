/**
 * @file server.js
 * @description Entry point — loads env vars, starts the Express server.
 * Run with: node --watch server.js (dev)  |  node server.js (prod)
 */

import 'dotenv/config';
import app from './src/app.js';
import { logger } from './src/utils/logger.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`[server] gt-api running on http://localhost:${PORT}`);
  logger.info(`[server] Health check → http://localhost:${PORT}/health`);
});
