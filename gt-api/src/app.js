/**
 * @file app.js
 * @description Express application setup — middleware, routes, error handler.
 * Imported by server.js which binds it to a port.
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { authRouter }         from './routes/auth.js';
import { transactionsRouter } from './routes/transactions.js';
import { ingestRouter }       from './routes/ingest.js';
import { budgetsRouter }      from './routes/budgets.js';
import { statementsRouter }   from './routes/statements.js';
import { errorHandler }       from './middleware/errorHandler.js';
import { logger }             from './utils/logger.js';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Matches all Vercel preview deployments for this project:
// gotrackprod2.vercel.app, gotrackprod2-abc123-project.vercel.app, etc.
const VERCEL_PREVIEW_RE = /^https:\/\/gotrackprod2[a-z0-9-]*\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow exact matches from ALLOWED_ORIGINS env var
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow all Vercel deployments for this project (prod + previews)
      if (VERCEL_PREVIEW_RE.test(origin)) return callback(null, true);
      logger.warn(`[cors] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '2mb' }));

// ─── HTTP request logging ─────────────────────────────────────────────────────

app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gt-api', ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth',         authRouter);
app.use('/transactions', transactionsRouter);
app.use('/ingest',       ingestRouter);
app.use('/budgets',      budgetsRouter);
app.use('/statements',   statementsRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use(errorHandler);

export default app;
