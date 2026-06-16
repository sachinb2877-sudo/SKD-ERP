// Load .env BEFORE any other imports (modules evaluate at import time)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// ── Security Headers ─────────────────────────────────────────
app.use(helmet());

// ── CORS — explicit origin whitelist ─────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.PRODUCTION_URL, // e.g. https://skd-erp.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman in dev)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Rate Limiting ────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Aggressive rate limit on login (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ── Body Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Wrap Vercel-style handler(req, res) so Express doesn't pass `next` as second arg
function wrap(handler) {
  return (req, res) => handler(req, res);
}

// Helper to merge Express route params into req.query (Vercel uses req.query for dynamic segments)
function injectParams(req, _res, next) {
  const q = { ...req.query, ...req.params };
  Object.defineProperty(req, 'query', {
    value: q,
    configurable: true,
    enumerable: true,
    writable: true
  });
  next();
}

// Import Handlers (dynamic to ensure env is loaded first)
const { default: healthHandler } = await import('./api/health.js');
const { default: seedHandler } = await import('./api/seed.js');
const { default: accountsHandler } = await import('./api/accounts/index.js');
const { default: authLoginHandler } = await import('./api/auth/login.js');
const { default: authMeHandler } = await import('./api/auth/me.js');
const { default: categoriesHandler } = await import('./api/categories/index.js');
const { default: dashboardHandler } = await import('./api/dashboard/index.js');
const { default: partiesHandler } = await import('./api/parties/index.js');
const { default: partyIdHandler } = await import('./api/parties/[id].js');
const { default: transactionsHandler } = await import('./api/transactions/index.js');
const { default: transactionIdHandler } = await import('./api/transactions/[id].js');
const { default: usersHandler } = await import('./api/users/index.js');
const { default: userIdHandler } = await import('./api/users/[id].js');
const { default: userPermissionsHandler } = await import('./api/users/permissions.js');

// Setup Routes
app.all('/api/health', wrap(healthHandler));
app.all('/api/seed', wrap(seedHandler));

app.all('/api/accounts', wrap(accountsHandler));

// Login gets its own aggressive rate limiter
app.all('/api/auth/login', loginLimiter, wrap(authLoginHandler));
app.all('/api/auth/me', wrap(authMeHandler));

app.all('/api/categories', wrap(categoriesHandler));
app.all('/api/dashboard', wrap(dashboardHandler));

app.all('/api/parties', wrap(partiesHandler));
app.all('/api/parties/:id', injectParams, wrap(partyIdHandler));

app.all('/api/transactions', wrap(transactionsHandler));
app.all('/api/transactions/:id', injectParams, wrap(transactionIdHandler));

app.all('/api/users', wrap(usersHandler));
app.all('/api/users/:id/permissions', injectParams, wrap(userPermissionsHandler));
app.all('/api/users/:id', injectParams, wrap(userIdHandler));

// 404 Fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend API Server running on http://localhost:${PORT}`);
});
