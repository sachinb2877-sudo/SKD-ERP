// ═══════════════════════════════════════════════════════════
// calculations.js — Financial calculation utilities for ERP
// ═══════════════════════════════════════════════════════════

/**
 * Legacy summary calculator (kept for backward compatibility).
 * Works with BOTH old flat transactions and new double-entry ones.
 */
export const calculateFinancialSummary = (transactions) => {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(txn => {
    // New double-entry format
    if (txn.entries) {
      txn.entries.forEach(entry => {
        // Simple heuristic: income account credits, expense account debits
        if (entry.accountId === 'acc_income') {
          totalIncome += entry.credit - entry.debit;
        }
        if (entry.accountId === 'acc_expense') {
          totalExpense += entry.debit - entry.credit;
        }
      });
    } else {
      // Old flat format fallback
      if (txn.type === 'INCOME') totalIncome += txn.amount;
      if (txn.type === 'EXPENSE') totalExpense += txn.amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
  };
};

/**
 * Compute the net balance for a specific account across transactions.
 * Returns: debit-heavy = positive, credit-heavy = negative.
 */
export const computeAccountBalance = (transactions, accountId) => {
  let balance = 0;
  transactions.forEach(txn => {
    if (!txn.entries) return;
    txn.entries.forEach(entry => {
      if (entry.accountId === accountId) {
        balance += entry.debit - entry.credit;
      }
    });
  });
  return balance;
};

/**
 * Compute a running ledger for a given account (sorted by date).
 * Returns: [{ date, remarks, debit, credit, balance, partyId, txnId }]
 */
export const computeAccountLedger = (transactions, accountId) => {
  // Collect all relevant entries with their parent transaction metadata
  const entries = [];
  transactions.forEach(txn => {
    if (!txn.entries) return;
    txn.entries.forEach(entry => {
      if (entry.accountId === accountId) {
        entries.push({
          txnId: txn.id,
          date: txn.date,
          remarks: txn.remarks || '',
          debit: entry.debit,
          credit: entry.credit,
          partyId: txn.partyId || null,
          category: txn.category || '',
        });
      }
    });
  });

  // Sort by date ascending
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Add running balance
  let balance = 0;
  return entries.map(e => {
    balance += e.debit - e.credit;
    return { ...e, balance };
  });
};

/**
 * Compute Profit & Loss for a date range.
 * Returns: { revenue: { [accountId]: amount }, expenses: { [accountId]: amount }, totalRevenue, totalExpenses, netProfit }
 */
export const computePnL = (transactions, accounts) => {
  const revenue = {};
  const expenses = {};
  let totalRevenue = 0;
  let totalExpenses = 0;

  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });

  transactions.forEach(txn => {
    if (!txn.entries) return;
    txn.entries.forEach(entry => {
      const acc = accMap[entry.accountId];
      if (!acc) return;

      if (acc.group === 'INCOME' || acc.type === 'REVENUE') {
        const amt = entry.credit - entry.debit;
        revenue[acc.id] = (revenue[acc.id] || 0) + amt;
        totalRevenue += amt;
      }
      if (acc.group === 'EXPENSE' || acc.type === 'EXPENSE') {
        const amt = entry.debit - entry.credit;
        expenses[acc.id] = (expenses[acc.id] || 0) + amt;
        totalExpenses += amt;
      }
    });
  });

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };
};

/**
 * Compute Balance Sheet from ALL cumulative transactions.
 * Returns: { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity }
 */
export const computeBalanceSheet = (allTransactions, accounts) => {
  const assets = {};     // Cash + Bank + AR
  const liabilities = {}; // AP
  let totalAssets = 0;
  let totalLiabilities = 0;

  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });

  // Compute raw balances
  const balances = {};
  allTransactions.forEach(txn => {
    if (!txn.entries) return;
    txn.entries.forEach(entry => {
      balances[entry.accountId] = (balances[entry.accountId] || 0) + (entry.debit - entry.credit);
    });
  });

  accounts.forEach(acc => {
    const bal = balances[acc.id] || 0;
    if (acc.type === 'ASSET') {
      assets[acc.id] = { name: acc.name, balance: bal, group: acc.group };
      totalAssets += bal;
    }
    if (acc.type === 'LIABILITY') {
      const absBal = Math.abs(bal);
      liabilities[acc.id] = { name: acc.name, balance: absBal, group: acc.group };
      totalLiabilities += absBal;
    }
  });

  // Equity = Retained Earnings = cumulative P&L
  const pnl = computePnL(allTransactions, accounts);
  const retainedEarnings = pnl.netProfit;
  const totalEquity = retainedEarnings;

  return {
    assets,
    liabilities,
    equity: { retainedEarnings },
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
};

/**
 * Compute outstanding balance for a specific party.
 */
export const computePartyBalance = (transactions, partyId) => {
  let totalDebit = 0;
  let totalCredit = 0;

  transactions.forEach(txn => {
    if (txn.partyId !== partyId || !txn.entries) return;
    txn.entries.forEach(entry => {
      // We only care about the AR/AP linked account entries
      if (entry.accountId.includes(partyId)) {
        totalDebit += entry.debit;
        totalCredit += entry.credit;
      }
    });
  });

  return { totalDebit, totalCredit, outstanding: totalDebit - totalCredit };
};

/**
 * Category-wise expense breakdown (works with new double-entry format).
 */
export const calculateCategoryBreakdown = (transactions) => {
  const breakdown = {};

  transactions.forEach(txn => {
    if (!txn.entries) {
      // Old format fallback
      if (txn.type === 'EXPENSE') {
        breakdown[txn.categoryId] = (breakdown[txn.categoryId] || 0) + txn.amount;
      }
      return;
    }

    // New format: check if any entry hits an expense account
    const hasExpense = txn.entries.some(e => e.accountId === 'acc_expense' && e.debit > 0);
    if (hasExpense) {
      const amt = txn.entries.find(e => e.accountId === 'acc_expense')?.debit || 0;
      const cat = txn.category || 'Other';
      breakdown[cat] = (breakdown[cat] || 0) + amt;
    }
  });

  return breakdown;
};

export const analyzeBudget = (transactions, budgetLimit) => {
  const { totalExpense } = calculateFinancialSummary(transactions);
  const utilizationPercent = (totalExpense / budgetLimit) * 100;

  let alertLevel = 'NORMAL';
  if (utilizationPercent >= 100) alertLevel = 'CRITICAL_🚨';
  else if (utilizationPercent >= 80) alertLevel = 'WARNING_⚠️';

  return {
    used: totalExpense,
    remaining: Math.max(0, budgetLimit - totalExpense),
    utilizationPercent: utilizationPercent.toFixed(2),
    alertLevel,
  };
};
