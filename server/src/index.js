import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup PostgreSQL Pool
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skd_erp',
});

// Test connection on launch
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failure:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database successfully');
    release();
  }
});

app.set('db', pool);

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SKD ERP API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// ── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ SKD ERP API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});
