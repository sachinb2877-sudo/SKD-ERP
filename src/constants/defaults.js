// ═══════════════════════════════════════════════════════════
// defaults.js — Application constants and seed data
// ═══════════════════════════════════════════════════════════

/**
 * System-level chart of accounts.
 * These accounts are auto-created and cannot be deleted by users.
 */
export const SYSTEM_ACCOUNTS = [
  { id: 'acc_cash',          name: 'Cash',                  type: 'ASSET',     group: 'CASH',          isSystem: true },
  { id: 'acc_bank',          name: 'Bank Account',          type: 'ASSET',     group: 'BANK',          isSystem: true },
  { id: 'acc_milk_sales',    name: 'Milk Sales Revenue',    type: 'REVENUE',   group: 'INCOME',        isSystem: true },
  { id: 'acc_prod_sales',    name: 'Product Sales Revenue', type: 'REVENUE',   group: 'INCOME',        isSystem: true },
  { id: 'acc_other_inc',     name: 'Other Income',          type: 'REVENUE',   group: 'INCOME',        isSystem: true },
  { id: 'acc_milk_purchase', name: 'Milk Purchase Expense', type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_salaries',      name: 'Salaries & Wages',      type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_fuel',          name: 'Fuel & Transportation', type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_electricity',   name: 'Electricity & Power',   type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_maintenance',   name: 'Maintenance & Repairs', type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_office',        name: 'Office Expenses',       type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_transport',     name: 'Transport Costs',       type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_feed_purchase', name: 'Cattle Feed Purchase',  type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true },
  { id: 'acc_equip_asset',   name: 'Dairy Equipment Asset', type: 'ASSET',     group: 'FIXED_ASSETS',  isSystem: true },
  { id: 'acc_other_exp',     name: 'Miscellaneous Expense', type: 'EXPENSE',   group: 'EXPENSE',       isSystem: true }
];

/**
 * Default transaction categories available on first run.
 */
export const DEFAULT_CATEGORIES = [
  'Milk Purchase',
  'Salary',
  'Fuel',
  'Transport',
  'Electricity',
  'Maintenance',
  'Office Expenses',
  'Feed Purchase',
  'Equipment Purchase',
  'Miscellaneous'
];

/**
 * Seed user accounts created on first run.
 * Admin can add/edit/delete users from the User Management panel.
 */
export const DEFAULT_USERS = [
  { id: 'admin',      password: 'admin123',   name: 'Admin',      role: 'ADMIN'   },
  { id: 'checker',    password: 'checker123', name: 'Checker',    role: 'CHECKER' },
  { id: 'accountant', password: 'acc123',     name: 'Accountant', role: 'MAKER'   },
  { id: 'viewer',     password: 'viewer123',  name: 'Viewer',     role: 'VIEWER'  },
];

/**
 * Empty database template used for fresh installations.
 */
export const EMPTY_DB = {
  version: 3,
  accounts: [...SYSTEM_ACCOUNTS],
  parties: [],
  transactions: [],
  categories: [...DEFAULT_CATEGORIES],
  auditTrail: [],
};

/**
 * Role definitions with human-readable labels.
 */
export const ROLE_OPTIONS = [
  { value: 'ADMIN',   label: 'Admin (Full Access)' },
  { value: 'CHECKER', label: 'Checker (Approver)' },
  { value: 'MAKER',   label: 'Maker (Accountant)' },
  { value: 'VIEWER',  label: 'Viewer (Read Only)' },
];

/**
 * Role display labels (short form for badges and pills).
 */
export const ROLE_LABELS = {
  ADMIN:   'Admin',
  CHECKER: 'Checker',
  MAKER:   'Accountant',
  VIEWER:  'Viewer',
};

/**
 * CSS class mappings for role-based color coding.
 */
export const ROLE_COLORS = {
  ADMIN:   'admin-role',
  CHECKER: 'checker-role',
  MAKER:   'maker-role',
  VIEWER:  'viewer-role',
};

/**
 * localStorage keys — centralized to avoid magic strings.
 */
export const STORAGE_KEYS = {
  DATABASE:     'erp_db',
  USERS:        'erp_users',
  CURRENT_USER: 'erp_current_user',
};

/**
 * Application metadata.
 */
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'SKD ERP',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  currencySymbol: import.meta.env.VITE_CURRENCY_SYMBOL || '₹',
  currencyCode: import.meta.env.VITE_CURRENCY_CODE || 'INR',
  maxAuditEntries: 500,
};
