import React, { createContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SYSTEM_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_USERS,
  EMPTY_DB,
  STORAGE_KEYS,
  APP_CONFIG,
} from '../constants/defaults.js';

// ─── MIGRATION: old flat transactions → new double-entry ──────
function migrateOldData() {
  const oldTxns = localStorage.getItem('finance_transactions');
  const oldCats = localStorage.getItem('finance_categories');

  if (!oldTxns) return null;

  const transactions = JSON.parse(oldTxns);
  const categories = oldCats ? JSON.parse(oldCats) : [...DEFAULT_CATEGORIES];

  const migrated = {
    ...EMPTY_DB,
    categories: [...new Set([...DEFAULT_CATEGORIES, ...categories])],
    transactions: transactions.map(txn => {
      if (txn.type === 'INCOME') {
        return {
          id: txn.id,
          date: txn.date,
          remarks: txn.notes || 'Migrated income',
          entries: [
            { accountId: 'acc_cash', debit: txn.amount, credit: 0 },
            { accountId: 'acc_income', debit: 0, credit: txn.amount },
          ],
          partyId: null,
          category: 'Salary',
          status: 'APPROVED',
          isDeleted: false,
          createdBy: 'System',
          createdAt: txn.date + 'T00:00:00Z',
        };
      } else {
        return {
          id: txn.id,
          date: txn.date,
          remarks: txn.notes || 'Migrated expense',
          entries: [
            { accountId: 'acc_expense', debit: txn.amount, credit: 0 },
            { accountId: 'acc_cash', debit: 0, credit: txn.amount },
          ],
          partyId: null,
          category: txn.categoryId || 'Expense',
          status: 'APPROVED',
          isDeleted: false,
          createdBy: 'System',
          createdAt: txn.date + 'T00:00:00Z',
        };
      }
    }),
  };

  localStorage.removeItem('finance_transactions');
  localStorage.removeItem('finance_categories');

  return migrated;
}

// ─── LOAD FROM LOCALSTORAGE ───────────────────────────────────
function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEYS.DATABASE);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Ensure all system accounts exist
      const existingIds = new Set(parsed.accounts.map(a => a.id));
      SYSTEM_ACCOUNTS.forEach(sa => {
        if (!existingIds.has(sa.id)) parsed.accounts.push({ ...sa });
      });
      // Ensure auditTrail array exists (v2 → v3 migration)
      if (!parsed.auditTrail) parsed.auditTrail = [];
      // Ensure all txns have status & isDeleted fields
      parsed.transactions = parsed.transactions.map(txn => ({
        status: 'APPROVED',
        isDeleted: false,
        createdBy: 'Admin',
        ...txn,
      }));
      // Ensure custom categories have corresponding accounts
      const existingNames = new Set(parsed.accounts.map(a => a.name.toLowerCase()));
      parsed.categories.forEach(cat => {
        if (!DEFAULT_CATEGORIES.includes(cat) && !existingNames.has(cat.toLowerCase())) {
          const cleanId = `acc_exp_${cat.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          if (!parsed.accounts.some(a => a.id === cleanId)) {
            parsed.accounts.push({
              id: cleanId,
              name: cat,
              type: 'EXPENSE',
              group: 'EXPENSE',
              isSystem: false
            });
          }
        }
      });
      return parsed;
    } catch {
      console.error('Corrupt erp_db, resetting.');
    }
  }

  const migrated = migrateOldData();
  if (migrated) return migrated;

  return { ...EMPTY_DB };
}

export const getFY = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().getFullYear().toString();
  const year = d.getFullYear();
  const month = d.getMonth();
  // Financial Year in India: April 1 to March 31
  const fyStart = month >= 3 ? year : year - 1;
  return fyStart.toString();
};

export const getNextVoucherNo = (transactions, type, dateStr) => {
  const prefixMap = {
    RECEIPT: 'RV',
    PAYMENT: 'PV',
    JOURNAL: 'JV',
    CONTRA: 'CV'
  };
  const prefix = prefixMap[type] || 'TX';
  const fy = getFY(dateStr);
  const searchPrefix = `${prefix}-${fy}-`;

  const matches = transactions.filter(t => t.voucherNo && t.voucherNo.startsWith(searchPrefix));
  let maxSeq = 0;
  matches.forEach(t => {
    const seqStr = t.voucherNo.substring(searchPrefix.length);
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  return `${searchPrefix}${nextSeq.toString().padStart(4, '0')}`;
};

// ─── CONTEXT ──────────────────────────────────────────────────
export const ERPContext = createContext(null);

export function ERPProvider({ children }) {
  const [db, setDB] = useState(loadDB);

  // ── User Management (persisted in localStorage) ───────────
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* fall through */ }
    }
    return [...DEFAULT_USERS];
  });

  // Persist users
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Authentication state (null = not logged in)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const isAuthenticated = currentUser !== null;

  // Login: validate credentials against dynamic users list
  const login = useCallback((userId, password) => {
    const user = users.find(u => u.id === userId && u.password === password);
    if (user) {
      const session = { id: user.id, name: user.name, role: user.role };
      setCurrentUser(session);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(session));
      
      const entry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: user.name,
        role: user.role,
        ipAddress: '127.0.0.1',
        action: 'USER_LOGIN',
        newValue: `User ${user.name} logged in successfully.`
      };
      setDB(prev => ({
        ...prev,
        auditTrail: [entry, ...prev.auditTrail].slice(0, 500)
      }));
      return { success: true };
    }
    return { success: false, error: 'Invalid User ID or Password' };
  }, [users]);

  // Logout: clear session
  const logout = useCallback(() => {
    if (currentUser) {
      const entry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'USER_LOGOUT',
        newValue: `User ${currentUser.name} logged out.`
      };
      setDB(prev => ({
        ...prev,
        auditTrail: [entry, ...prev.auditTrail].slice(0, 500)
      }));
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }, [currentUser]);

  // ── User CRUD (Admin only) ────────────────────────────────
  const addUser = useCallback((user) => {
    setUsers(prev => {
      if (prev.find(u => u.id === user.id)) return prev;
      return [...prev, user];
    });
  }, []);

  const editUser = useCallback((userId, updates) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    // If the edited user is currently logged in, update their session
    setCurrentUser(prev => {
      if (prev && prev.id === userId) {
        const updated = { ...prev, ...updates };
        delete updated.password; // Don't store password in session
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, []);

  const deleteUser = useCallback((userId) => {
    if (userId === 'admin') return; // Protect admin
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  // Global fiscal year filter
  const [fiscalYear, setFiscalYear] = useState('ALL');

  // Persist user role
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  // ── Persist to localStorage (debounced) ───────────────────
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.DATABASE, JSON.stringify(db));
    }, 300);
    return () => clearTimeout(saveTimer.current);
  }, [db]);

  // ── Helper: update DB immutably ───────────────────────────
  const updateDB = useCallback((updater) => {
    setDB(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...next };
    });
  }, []);

  // ── Helper: add audit trail entry ─────────────────────────
  const addAuditEntry = useCallback((action, details) => {
    const entry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      user: currentUser ? currentUser.name : 'System',
      role: currentUser ? currentUser.role : 'SYSTEM',
      ipAddress: '127.0.0.1',
      action,
      ...details,
    };
    updateDB(prev => ({
      ...prev,
      auditTrail: [entry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries),
    }));
  }, [currentUser, updateDB]);

  // ══════════════════════════════════════════════════════════
  // TRANSACTION ACTIONS (with Maker-Checker)
  // ══════════════════════════════════════════════════════════

  const addTransaction = useCallback((txn) => {
    const status = currentUser.role === 'MAKER' ? 'PENDING' : 'APPROVED';

    updateDB(prev => {
      const vNo = txn.voucherNo || getNextVoucherNo(prev.transactions, txn.type, txn.date);
      const enrichedTxn = {
        reconciledStatus: 'UNRECONCILED',
        clearanceDate: '',
        paymentMode: 'CASH',
        refNo: '',
        ...txn,
        voucherNo: vNo,
        status,
        isDeleted: false,
        createdBy: currentUser.name,
        createdAt: new Date().toISOString()
      };

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'TRANSACTION_CREATED',
        txnId: txn.id,
        newValue: JSON.stringify({
          voucherNo: vNo,
          type: txn.type,
          amount: txn.entries?.[0]?.debit || txn.entries?.[0]?.credit || 0,
          remarks: txn.remarks,
          status
        })
      };

      return {
        ...prev,
        transactions: [enrichedTxn, ...prev.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  const editTransaction = useCallback((id, updatedTxn) => {
    updateDB(prev => {
      const oldTxn = prev.transactions.find(t => t.id === id);
      if (!oldTxn) return prev;
      const enrichedTxn = { ...oldTxn, ...updatedTxn };

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'TRANSACTION_EDITED',
        txnId: id,
        oldValue: JSON.stringify(oldTxn),
        newValue: JSON.stringify(enrichedTxn)
      };

      return {
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? enrichedTxn : t),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  // Approve a pending transaction (Checker action)
  const approveTransaction = useCallback((id) => {
    updateDB(prev => {
      const oldTxn = prev.transactions.find(t => t.id === id);
      if (!oldTxn) return prev;

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'TRANSACTION_APPROVED',
        txnId: id,
        oldValue: 'PENDING',
        newValue: 'APPROVED'
      };

      return {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === id ? {
            ...t,
            status: 'APPROVED',
            approvedBy: currentUser.name,
            approvedAt: new Date().toISOString()
          } : t
        ),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  // Reject a pending transaction (Checker action)
  const rejectTransaction = useCallback((id, rejectionNote) => {
    updateDB(prev => {
      const oldTxn = prev.transactions.find(t => t.id === id);
      if (!oldTxn) return prev;

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'TRANSACTION_REJECTED',
        txnId: id,
        oldValue: 'PENDING',
        newValue: `REJECTED. Note: ${rejectionNote}`
      };

      return {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === id ? {
            ...t,
            status: 'REJECTED',
            rejectedBy: currentUser.name,
            rejectionNote,
            rejectedAt: new Date().toISOString()
          } : t
        ),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  // Soft-delete a transaction (requires reason)
  const deleteTransaction = useCallback((id, reason) => {
    updateDB(prev => {
      const oldTxn = prev.transactions.find(t => t.id === id);
      if (!oldTxn) return prev;

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'TRANSACTION_DELETED',
        txnId: id,
        oldValue: JSON.stringify(oldTxn),
        newValue: `Deleted. Reason: ${reason}`
      };

      return {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === id ? {
            ...t,
            isDeleted: true,
            deletedBy: currentUser.name,
            deleteReason: reason,
            deletedAt: new Date().toISOString()
          } : t
        ),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  const reconcileTransaction = useCallback((id, clearanceDate) => {
    updateDB(prev => {
      const oldTxn = prev.transactions.find(t => t.id === id);
      if (!oldTxn) return prev;

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'BANK_RECONCILED',
        txnId: id,
        oldValue: 'UNRECONCILED',
        newValue: `RECONCILED on ${clearanceDate}`
      };

      return {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === id ? { ...t, reconciledStatus: 'RECONCILED', clearanceDate } : t
        ),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  const unreconcileTransaction = useCallback((id) => {
    updateDB(prev => {
      const oldTxn = prev.transactions.find(t => t.id === id);
      if (!oldTxn) return prev;

      const auditEntry = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        user: currentUser.name,
        role: currentUser.role,
        ipAddress: '127.0.0.1',
        action: 'BANK_UNRECONCILED',
        txnId: id,
        oldValue: 'RECONCILED',
        newValue: 'UNRECONCILED'
      };

      return {
        ...prev,
        transactions: prev.transactions.map(t =>
          t.id === id ? { ...t, reconciledStatus: 'UNRECONCILED', clearanceDate: '' } : t
        ),
        auditTrail: [auditEntry, ...prev.auditTrail].slice(0, APP_CONFIG.maxAuditEntries)
      };
    });
  }, [updateDB, currentUser]);

  // ══════════════════════════════════════════════════════════
  // PARTY ACTIONS
  // ══════════════════════════════════════════════════════════

  const addParty = useCallback((party) => {
    const linkedAccount = party.type === 'CUSTOMER'
      ? {
          id: `acc_ar_${party.id}`,
          name: `AR - ${party.name}`,
          type: 'ASSET',
          group: 'RECEIVABLE',
          isSystem: false,
        }
      : {
          id: `acc_ap_${party.id}`,
          name: `AP - ${party.name}`,
          type: 'LIABILITY',
          group: 'PAYABLE',
          isSystem: false,
        };

    const enrichedParty = {
      ...party,
      ...(party.type === 'CUSTOMER'
        ? { receivableAccountId: linkedAccount.id }
        : { payableAccountId: linkedAccount.id }),
      createdAt: new Date().toISOString(),
    };

    updateDB(prev => ({
      ...prev,
      parties: [...prev.parties, enrichedParty],
      accounts: [...prev.accounts, linkedAccount],
    }));

    addAuditEntry('PARTY_CREATED', { partyId: party.id, name: party.name, type: party.type });
  }, [updateDB, addAuditEntry]);

  const editParty = useCallback((id, updates) => {
    updateDB(prev => {
      const partyIdx = prev.parties.findIndex(p => p.id === id);
      if (partyIdx === -1) return prev;

      const updatedParties = [...prev.parties];
      const oldParty = updatedParties[partyIdx];
      updatedParties[partyIdx] = { ...oldParty, ...updates };

      const linkedAccId = oldParty.type === 'CUSTOMER'
        ? oldParty.receivableAccountId
        : oldParty.payableAccountId;

      const updatedAccounts = prev.accounts.map(acc => {
        if (acc.id === linkedAccId && updates.name) {
          const prefix = oldParty.type === 'CUSTOMER' ? 'AR' : 'AP';
          return { ...acc, name: `${prefix} - ${updates.name}` };
        }
        return acc;
      });

      return { ...prev, parties: updatedParties, accounts: updatedAccounts };
    });
  }, [updateDB]);

  const deleteParty = useCallback((id) => {
    updateDB(prev => {
      const party = prev.parties.find(p => p.id === id);
      if (!party) return prev;
      const linkedAccId = party.type === 'CUSTOMER'
        ? party.receivableAccountId
        : party.payableAccountId;
      return {
        ...prev,
        parties: prev.parties.filter(p => p.id !== id),
        accounts: prev.accounts.filter(a => a.id !== linkedAccId),
      };
    });
    addAuditEntry('PARTY_DELETED', { partyId: id });
  }, [updateDB, addAuditEntry]);

  // ══════════════════════════════════════════════════════════
  // ACCOUNT & CATEGORY ACTIONS
  // ══════════════════════════════════════════════════════════

  const addAccount = useCallback((account) => {
    updateDB(prev => ({
      ...prev,
      accounts: [...prev.accounts, account],
    }));
  }, [updateDB]);

  const addCategory = useCallback((name, type = 'EXPENSE') => {
    updateDB(prev => {
      const cleanId = `acc_${type === 'REVENUE' ? 'rev' : 'exp'}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      const accountExists = prev.accounts.some(a => a.id === cleanId);
      
      const newAccounts = [...prev.accounts];
      if (!accountExists) {
        newAccounts.push({
          id: cleanId,
          name: name,
          type: type === 'REVENUE' ? 'REVENUE' : 'EXPENSE',
          group: type === 'REVENUE' ? 'INCOME' : 'EXPENSE',
          isSystem: false
        });
      }

      if (prev.categories.includes(name)) {
        return { ...prev, accounts: newAccounts };
      }
      return { 
        ...prev, 
        categories: [...prev.categories, name],
        accounts: newAccounts
      };
    });
  }, [updateDB]);

  const resetDatabase = useCallback(() => {
    const entry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      user: currentUser ? currentUser.name : 'System',
      role: currentUser ? currentUser.role : 'SYSTEM',
      ipAddress: '127.0.0.1',
      action: 'DATABASE_RESET',
      newValue: 'Database was reset to default factory settings by Admin.'
    };
    updateDB(() => ({
      ...EMPTY_DB,
      auditTrail: [entry]
    }));
  }, [currentUser, updateDB]);

  // ══════════════════════════════════════════════════════════
  // DERIVED STATE (memoized)
  // ══════════════════════════════════════════════════════════

  // Active transactions = approved AND not deleted
  const activeTransactions = useMemo(() => {
    return db.transactions.filter(t => t.status === 'APPROVED' && !t.isDeleted);
  }, [db.transactions]);

  // Fiscal-year-filtered (only active/approved, not deleted)
  const filteredTransactions = useMemo(() => {
    const base = activeTransactions;
    if (fiscalYear === 'ALL') return base;
    return base.filter(t => new Date(t.date).getFullYear().toString() === fiscalYear);
  }, [activeTransactions, fiscalYear]);

  // Pending approval queue
  const pendingTransactions = useMemo(() => {
    return db.transactions.filter(t => t.status === 'PENDING' && !t.isDeleted);
  }, [db.transactions]);

  // Available fiscal years
  const availableYears = useMemo(() => {
    const years = new Set(activeTransactions.map(t => new Date(t.date).getFullYear().toString()));
    return [...years].sort().reverse();
  }, [activeTransactions]);

  // Compute account balances from APPROVED, non-deleted transactions only
  const accountBalances = useMemo(() => {
    const balances = {};
    db.accounts.forEach(acc => { balances[acc.id] = 0; });

    activeTransactions.forEach(txn => {
      txn.entries.forEach(entry => {
        if (!balances.hasOwnProperty(entry.accountId)) balances[entry.accountId] = 0;
        balances[entry.accountId] += (entry.debit - entry.credit);
      });
    });

    return balances;
  }, [activeTransactions, db.accounts]);

  // Balances filtered by fiscal year (for P&L)
  const periodBalances = useMemo(() => {
    const balances = {};
    db.accounts.forEach(acc => { balances[acc.id] = 0; });

    filteredTransactions.forEach(txn => {
      txn.entries.forEach(entry => {
        if (!balances.hasOwnProperty(entry.accountId)) balances[entry.accountId] = 0;
        balances[entry.accountId] += (entry.debit - entry.credit);
      });
    });

    return balances;
  }, [filteredTransactions, db.accounts]);

  // Summary: total income, expense, net profit for the period
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach(txn => {
      txn.entries.forEach(entry => {
        const acc = db.accounts.find(a => a.id === entry.accountId);
        if (!acc) return;
        if (acc.group === 'INCOME') {
          totalIncome += entry.credit - entry.debit;
        }
        if (acc.group === 'EXPENSE') {
          totalExpense += entry.debit - entry.credit;
        }
      });
    });

    let totalAR = 0;
    let totalAP = 0;
    db.accounts.forEach(acc => {
      const bal = accountBalances[acc.id] || 0;
      if (acc.group === 'RECEIVABLE') totalAR += bal;
      if (acc.group === 'PAYABLE') totalAP += Math.abs(bal);
    });

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      totalAR,
      totalAP,
      pendingCount: pendingTransactions.length,
    };
  }, [filteredTransactions, db.accounts, accountBalances, pendingTransactions]);

  // ── Context value ─────────────────────────────────────────
  const value = useMemo(() => ({
    // Raw data
    accounts: db.accounts,
    parties: db.parties,
    transactions: db.transactions,
    categories: db.categories,
    auditTrail: db.auditTrail,

    // Auth & Users
    currentUser,
    isAuthenticated,
    login,
    logout,
    users,
    addUser,
    editUser,
    deleteUser,

    // Filtered
    filteredTransactions,
    pendingTransactions,
    fiscalYear,
    setFiscalYear,
    availableYears,

    // Balances
    accountBalances,
    periodBalances,
    summary,

    // Actions
    addTransaction,
    editTransaction,
    deleteTransaction,
    approveTransaction,
    rejectTransaction,
    addParty,
    editParty,
    deleteParty,
    addAccount,
    addCategory,
    reconcileTransaction,
    unreconcileTransaction,
    resetDatabase,
  }), [
    db, filteredTransactions, pendingTransactions, fiscalYear, availableYears,
    accountBalances, periodBalances, summary, currentUser, isAuthenticated,
    login, logout, users, addUser, editUser, deleteUser,
    addTransaction, editTransaction, deleteTransaction, approveTransaction, rejectTransaction,
    addParty, editParty, deleteParty,
    addAccount, addCategory, setFiscalYear, reconcileTransaction, unreconcileTransaction,
    resetDatabase,
  ]);

  return (
    <ERPContext.Provider value={value}>
      {children}
    </ERPContext.Provider>
  );
}
