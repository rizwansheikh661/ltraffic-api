'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const redoc = require('redoc-express');

const env = require('./config/env');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const firebase = require('./config/firebase');

const requestId = require('./common/requestId');
const ApiError = require('./common/apiError');

const requestLog = require('./middlewares/requestLog.middleware');
const rateLimit = require('./middlewares/rateLimit.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const routes = require('./routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ── Security & baseline middleware ──────────────────────────
app.use(helmet());
// SEC-01 — CORS must fail-closed in production. Wildcard-when-unset is only allowed in dev.
if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.length === 0) {
  logger.error('[app] refusing to boot: CORS_ORIGINS must be set in production');
  throw new Error('CORS_ORIGINS empty in production');
}
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGINS.length === 0) {
        // dev only — env.NODE_ENV !== 'production' guaranteed by the boot check above
        return cb(null, true);
      }
      if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: `${env.UPLOAD_MAX_MB}mb` }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(requestId);
app.use(requestLog);

// Static uploads (dev only).
// Prod: Apache/IIS serves UPLOADS_ROOT — Node has no static-file role.
// Dev: mount at '/' so DB-stored relative paths (e.g. 'admin/hsupload/foo.jpg')
// resolve to previewable URLs without needing Apache running locally.
if (env.NODE_ENV !== 'production') {
  app.use('/', express.static(env.UPLOADS_ROOT));
}

// ── Swagger UI ──────────────────────────────────────────────
app.use(
  `${env.API_PREFIX}/docs`,
  (_req, res, next) => { res.removeHeader('Content-Security-Policy'); next(); },
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'LTraffic API Docs',
    swaggerOptions: { defaultModelsExpandDepth: -1, docExpansion: 'none' },
    customCss: `
.swagger-ui .opblock-tag small { display: none; }
.swagger-ui .opblock-tag[data-is-open="true"] small { display: block; margin-top: 8px; }
.swagger-ui .opblock-tag { padding: 10px 20px 10px 10px; }

/* ── Group headers via CSS pseudo-elements (no DOM injection) ── */
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Authentication"])::before,
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Devices"])::before,
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Vehicle Checks"])::before,
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Admin - Bulletins"])::before {
  display: block;
  padding: 10px 15px;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #3b4151;
  font-family: sans-serif;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-left: 4px solid;
}
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Authentication"])::before {
  content: 'AUTHENTICATION';
  border-left-color: #49cc90;
  background: linear-gradient(90deg, #f0faf4 0%, transparent 100%);
}
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Devices"])::before {
  content: 'COMMON APIS';
  border-left-color: #61affe;
  background: linear-gradient(90deg, #eef6ff 0%, transparent 100%);
  margin-top: 20px;
}
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Vehicle Checks"])::before {
  content: 'EMPLOYEE APIS';
  border-left-color: #fca130;
  background: linear-gradient(90deg, #fff8f0 0%, transparent 100%);
  margin-top: 20px;
}
.swagger-ui .opblock-tag-section:has(> .opblock-tag[data-tag="Admin - Bulletins"])::before {
  content: 'ADMIN APIS';
  border-left-color: #f93e3e;
  background: linear-gradient(90deg, #fff0f0 0%, transparent 100%);
  margin-top: 20px;
}`,
    customJsStr: `
(function() {
  function init() {
    var authTag = document.querySelector('.opblock-tag[data-tag="Authentication"]');
    if (!authTag) return setTimeout(init, 500);
    if (authTag.getAttribute('data-is-open') !== 'true') authTag.click();
  }
  setTimeout(init, 1500);
})();`,
  }),
);
app.get(`${env.API_PREFIX}/openapi.json`, (_req, res) => res.json(swaggerSpec));

// ── ReDoc (grouped documentation portal) ──────────────────
app.get(
  `${env.API_PREFIX}/redoc`,
  (_req, res, next) => { res.removeHeader('Content-Security-Policy'); next(); },
  redoc({
    title: 'LTraffic API Docs',
    specUrl: `${env.API_PREFIX}/openapi.json`,
    redocOptions: {
      hideDownloadButton: false,
      expandResponses: '200',
      pathInMiddlePanel: true,
    },
  }),
);

// ── Rate limits ─────────────────────────────────────────────
app.use(env.API_PREFIX, rateLimit.global);

// ── Routes ──────────────────────────────────────────────────
app.use(env.API_PREFIX, routes);

// ── 404 for unknown API paths ───────────────────────────────
app.use((req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)));

// ── Central error handler (must be last) ────────────────────
app.use(errorMiddleware);

// Initialise FCM once at bootstrap. No-op if disabled.
firebase.init();

logger.info(`[app] wired (env=${env.NODE_ENV}, prefix=${env.API_PREFIX})`);

module.exports = app;
