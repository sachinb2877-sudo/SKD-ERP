-- ═══════════════════════════════════════════════════════════
-- SKD ERP — PostgreSQL Database Schema Definitions
-- ═══════════════════════════════════════════════════════════

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Custom Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'CHECKER', 'MAKER', 'VIEWER');
CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE voucher_type AS ENUM ('RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE reconciliation_status AS ENUM ('UNRECONCILED', 'RECONCILED');

-- 3. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'MAKER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Accounts Table (Chart of Accounts)
CREATE TABLE accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type account_type NOT NULL,
    "group" VARCHAR(50) NOT NULL,
    is_system BOOLEAN DEFAULT false,
    parent_id VARCHAR(50) REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Parties Table (Customers & Vendors)
CREATE TABLE parties (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CUSTOMER', 'VENDOR')),
    phone VARCHAR(20),
    email VARCHAR(100),
    gstin VARCHAR(15),
    receivable_account_id VARCHAR(50) REFERENCES accounts(id) ON DELETE SET NULL,
    payable_account_id VARCHAR(50) REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Transactions Table (Voucher Headers)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_no VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    type voucher_type NOT NULL,
    remarks TEXT NOT NULL,
    status approval_status NOT NULL DEFAULT 'PENDING',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    delete_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    payment_mode VARCHAR(30) DEFAULT 'CASH',
    ref_no VARCHAR(50),
    reconciled_status reconciliation_status NOT NULL DEFAULT 'UNRECONCILED',
    clearance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Ledger Entries Table (Double-Entry Rows)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id),
    party_id VARCHAR(50) REFERENCES parties(id) ON DELETE SET NULL,
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
    CONSTRAINT chk_debit_credit_not_both_zero CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

-- 8. Immutable Audit Trail Table
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    action VARCHAR(100) NOT NULL,
    txn_id VARCHAR(100),
    old_value TEXT,
    new_value TEXT
);

-- 9. Indices for query speed optimization
CREATE INDEX idx_txn_date ON transactions(date);
CREATE INDEX idx_txn_voucher ON transactions(voucher_no);
CREATE INDEX idx_ledger_txn ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX idx_audit_timestamp ON audit_trail(timestamp);

-- 10. Seed System Accounts
INSERT INTO accounts (id, name, type, "group", is_system) VALUES
('acc_cash', 'Cash', 'ASSET', 'CASH', true),
('acc_bank', 'Bank Account', 'ASSET', 'BANK', true),
('acc_milk_sales', 'Milk Sales Revenue', 'REVENUE', 'INCOME', true),
('acc_prod_sales', 'Product Sales Revenue', 'REVENUE', 'INCOME', true),
('acc_other_inc', 'Other Income', 'REVENUE', 'INCOME', true),
('acc_milk_purchase', 'Milk Purchase Expense', 'EXPENSE', 'EXPENSE', true),
('acc_salaries', 'Salaries & Wages', 'EXPENSE', 'EXPENSE', true),
('acc_fuel', 'Fuel & Transportation', 'EXPENSE', 'EXPENSE', true),
('acc_electricity', 'Electricity & Power', 'EXPENSE', 'EXPENSE', true),
('acc_maintenance', 'Maintenance & Repairs', 'EXPENSE', 'EXPENSE', true),
('acc_office', 'Office Expenses', 'EXPENSE', 'EXPENSE', true),
('acc_transport', 'Transport Costs', 'EXPENSE', 'EXPENSE', true),
('acc_feed_purchase', 'Cattle Feed Purchase', 'EXPENSE', 'EXPENSE', true),
('acc_equip_asset', 'Dairy Equipment Asset', 'ASSET', 'FIXED_ASSETS', true),
('acc_other_exp', 'Miscellaneous Expense', 'EXPENSE', 'EXPENSE', true);
