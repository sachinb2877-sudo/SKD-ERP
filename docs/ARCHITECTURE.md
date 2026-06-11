# Architecture — SKD ERP

## System Overview

SKD ERP is a **client-side Single Page Application (SPA)** built with React and Vite. All data is persisted in the browser's `localStorage`.

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│                                                 │
│  ┌──────────┐    ┌──────────────┐               │
│  │  React   │───▶│ ERPContext   │               │
│  │  Views   │◀───│ (State Mgmt) │               │
│  └──────────┘    └──────┬───────┘               │
│                         │                       │
│                  ┌──────▼───────┐               │
│                  │ localStorage │               │
│                  │  (erp_db)    │               │
│                  └──────────────┘               │
└─────────────────────────────────────────────────┘
```

## Module Map

| Module | File(s) | Responsibility |
|--------|---------|----------------|
| **State** | `ERPContext.jsx` | Global state, CRUD operations, auth |
| **Auth** | `LoginPage.jsx` | Login form, session management |
| **Dashboard** | `DashboardOverview.jsx` | KPI cards (income, expense, profit) |
| **Analytics** | `Analytics.jsx` | Chart.js visualizations |
| **Transactions** | `TransactionForm.jsx`, `TransactionList.jsx` | Double-entry bookkeeping |
| **Approvals** | `ApprovalQueue.jsx` | Maker-Checker workflow |
| **Ledger** | `Ledger.jsx` | Account-level debit/credit history |
| **Parties** | `PartyManager.jsx` | Customer/Vendor management |
| **Users** | `UserManager.jsx` | Admin user CRUD |
| **Reports** | `reportGenerator.js` | PDF generation (P&L, BS, Party) |
| **Utils** | `calculations.js`, `formatters.js` | Financial math, formatting |
| **Constants** | `defaults.js` | System accounts, roles, config |

## Data Model

### Database (`erp_db` in localStorage)
```json
{
  "version": 3,
  "accounts": [{ "id", "name", "type", "group", "isSystem" }],
  "parties": [{ "id", "name", "type", "phone", "email", "receivableAccountId" }],
  "transactions": [{
    "id", "date", "remarks", "category", "status",
    "entries": [{ "accountId", "debit", "credit" }],
    "partyId", "createdBy", "createdAt", "isDeleted"
  }],
  "categories": ["Expense", "Investment", ...],
  "auditTrail": [{ "id", "timestamp", "user", "action", ... }]
}
```

## Role-Based Access Control

| Permission | Admin | Checker | Maker | Viewer |
|------------|:-----:|:-------:|:-----:|:------:|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Create Transactions | ✅ (auto-approved) | ✅ (auto-approved) | ✅ (pending) | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ❌ |
| Delete Transactions | ✅ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ |

## Future Architecture (with Backend)

```
┌──────────┐     HTTP/REST      ┌──────────┐     ┌──────────┐
│  React   │ ◀───────────────▶  │ Express  │ ──▶ │ MongoDB  │
│  Client  │                    │  Server  │     │ Database │
│ (Vercel) │                    │ (Render) │     │ (Atlas)  │
└──────────┘                    └──────────┘     └──────────┘
```
