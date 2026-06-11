# SKD ERP — Backend Server

This is a **scaffold** for the backend API server. Currently, the SKD ERP frontend runs entirely client-side with localStorage.

## Getting Started

```bash
cd server
npm install
npm run dev
```

The server will start at `http://localhost:5000`.

## Next Steps to Build the Backend

1. **Database**: Add MongoDB (via Mongoose) or PostgreSQL (via Prisma)
2. **Auth**: Implement JWT-based authentication
3. **API Routes**: Create REST endpoints for:
   - `POST /api/auth/login` — User authentication
   - `GET /api/transactions` — List transactions
   - `POST /api/transactions` — Create transaction
   - `PATCH /api/transactions/:id/approve` — Approve transaction
   - `GET /api/parties` — List parties
   - `GET /api/reports/pnl` — Generate P&L report
4. **Validation**: Add input validation with `zod` or `express-validator`
5. **Security**: Add rate limiting, helmet, and password hashing (bcrypt)

## Deployment

See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for deployment instructions.
