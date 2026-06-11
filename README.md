# SKD ERP — Financial Management System

A professional-grade, role-based ERP dashboard for managing financial transactions, double-entry accounting, and party (customer/vendor) relationships. Built with React + Vite.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time overview of income, expenses, profit/loss, receivables & payables |
| **Analytics** | Interactive charts — income vs expense trends, category breakdown, investment growth |
| **Transactions** | Double-entry accounting with Receipt, Payment & Journal entry types |
| **Approval Queue** | Maker-Checker workflow — accountants submit, checkers approve/reject |
| **General Ledger** | Chronological debit/credit ledger for any account with running balances |
| **Party Management** | Customer & vendor accounts with linked AR/AP tracking |
| **User Management** | Admin-controlled user registry with role-based access (RBAC) |
| **PDF Reports** | Download Profit & Loss, Balance Sheet, and Party Ledger as styled PDFs |

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite 8
- **Charts:** Chart.js + react-chartjs-2
- **PDF Reports:** jsPDF + jspdf-autotable
- **Styling:** Vanilla CSS with glassmorphism design system
- **Typography:** [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)
- **State:** React Context API + localStorage persistence

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher**
- npm (comes with Node.js)

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/skd-erp.git
cd skd-erp

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env

# 4. Start the development server
npm run dev
```

The app will open at **http://localhost:5173**

---

## 🔐 Default Login Credentials

| Role | User ID | Password | Permissions |
|------|---------|----------|-------------|
| **Admin** | `admin` | `admin123` | Full access — manage users, approve, create, delete |
| **Checker** | `checker` | `checker123` | Approve/reject transactions, delete transactions |
| **Accountant** | `accountant` | `acc123` | Create transactions (submitted for approval) |
| **Viewer** | `viewer` | `viewer123` | Read-only — view dashboard, reports, ledger |

> **Note:** These are seed credentials for first run. Admin can manage users from the Users tab.

---

## 📁 Project Structure

```
skd-erp/
├── public/                     # Static assets
│   └── favicon.svg             # App icon
├── src/
│   ├── components/             # React UI components
│   │   ├── Analytics.jsx       # Charts & financial analytics
│   │   ├── ApprovalQueue.jsx   # Maker-Checker approval interface
│   │   ├── DashboardOverview.jsx
│   │   ├── DeleteConfirmModal.jsx
│   │   ├── GeneralLedger.jsx   # Account ledger with running balance
│   │   ├── LoginPage.jsx       # Authentication screen
│   │   ├── PartyManager.jsx    # Customer/Vendor CRUD
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   ├── TransactionForm.jsx # Double-entry transaction form
│   │   ├── TransactionList.jsx # Transaction table
│   │   └── UserManager.jsx     # Admin user management
│   ├── constants/
│   │   └── defaults.js         # System accounts, roles, categories
│   ├── context/
│   │   └── ERPContext.jsx      # Global state management
│   ├── hooks/
│   │   └── useERP.js           # Context consumer hook
│   ├── services/
│   │   └── reportGenerator.js  # PDF report generation
│   ├── styles/                 # Modular CSS
│   │   ├── base.css            # Variables, reset, typography
│   │   ├── layout.css          # App layout, sidebar, topbar
│   │   ├── components.css      # Cards, buttons, forms, tables
│   │   ├── pages.css           # Page-specific styles
│   │   └── index.css           # Import aggregator
│   ├── utils/
│   │   ├── calculations.js     # Financial computation utilities
│   │   └── formatters.js       # Currency & date formatters
│   ├── App.jsx                 # Main application shell
│   └── main.jsx                # React entry point
├── server/                     # Backend scaffold (future)
│   ├── src/index.js
│   ├── package.json
│   └── README.md
├── docs/                       # Documentation
│   ├── DEPLOYMENT.md           # Deployment guide
│   └── ARCHITECTURE.md         # System architecture
├── .env.example                # Environment variable template
├── .gitignore
├── LICENSE
├── package.json
├── vite.config.js
└── README.md                   # ← You are here
```

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |

---

## 🚢 Deployment

### Vercel (Recommended for Frontend)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repository
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click **Deploy**

### Netlify (Alternative)

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Build command: `npm run build`
4. Publish directory: `dist`

> See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

---

## ⚠️ Important Notes

- **Data Storage:** Currently uses browser `localStorage`. Data is per-browser and will be lost if browser data is cleared. This is suitable for demos and prototypes.
- **Passwords:** Stored in plain text in localStorage (demo mode). For production, integrate the backend with proper hashing (bcrypt).
- **The `server/` directory** contains a scaffold for future backend development with Express.js.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by SKD Team**
