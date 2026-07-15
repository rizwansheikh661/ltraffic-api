'use strict';

const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const db = require('./config/db');
const levelsCache = require('./modules/auth/levels.cache');

async function bootstrap() {
  // Warm boot-time caches. A failure here is fatal — we cannot serve auth
  // requests without the login_levels map.
  try {
    await levelsCache.load();
  } catch (err) {
    logger.error('[server] failed to load login_levels cache', { error: err.message });
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`[server] listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
    logger.info(`[server] swagger UI  http://localhost:${env.PORT}${env.API_PREFIX}/docs`);
  });

  async function shutdown(signal) {
    logger.info(`[server] received ${signal}, shutting down`);
    server.close(async (err) => {
      if (err) {
        logger.error('[server] error closing HTTP server', { error: err.message });
        process.exit(1);
      }
      try {
        await db.shutdown();
      } catch (e) {
        logger.warn('[server] db shutdown failed', { error: e.message });
      }
      process.exit(0);
    });

    // Hard-kill after 10s if graceful didn't finish.
    setTimeout(() => {
      logger.warn('[server] forced exit after 10s');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[server] unhandled promise rejection', { reason: reason?.message || String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('[server] uncaught exception', { error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
}

bootstrap();
