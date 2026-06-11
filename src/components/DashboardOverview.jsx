import React, { useMemo } from 'react';
import { useERP } from '../hooks/useERP.js';

const DashboardOverview = () => {
  const { filteredTransactions, accountBalances, summary, accounts } = useERP();

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

    let todayIncome = 0;
    let todayExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    filteredTransactions.forEach(txn => {
      if (!txn.entries) return;
      
      const isToday = txn.date === todayStr;
      const isThisMonth = txn.date.slice(0, 7) === currentMonthStr;

      txn.entries.forEach(entry => {
        const acc = accounts.find(a => a.id === entry.accountId);
        if (!acc) return;

        if (acc.group === 'INCOME') {
          const amt = entry.credit - entry.debit;
          if (isToday) todayIncome += amt;
          if (isThisMonth) monthlyIncome += amt;
        }
        if (acc.group === 'EXPENSE') {
          const amt = entry.debit - entry.credit;
          if (isToday) todayExpense += amt;
          if (isThisMonth) monthlyExpense += amt;
        }
      });
    });

    const cashBal = accountBalances['acc_cash'] || 0;
    const bankBal = accountBalances['acc_bank'] || 0;

    return {
      todayIncome,
      todayExpense,
      monthlyProfit: monthlyIncome - monthlyExpense,
      cashBal,
      bankBal
    };
  }, [filteredTransactions, accountBalances, accounts]);

  const cards = [
    { label: "Today's Income", value: metrics.todayIncome, className: 'positive', icon: '☀️ ↓' },
    { label: "Today's Expenses", value: metrics.todayExpense, className: 'negative', icon: '☀️ ↑' },
    { label: 'Cash Balance', value: metrics.cashBal, className: 'cash', icon: '💵' },
    { label: 'Bank Balance', value: metrics.bankBal, className: 'bank', icon: '🏦' },
    { label: 'Total Receivables (AR)', value: summary.totalAR, className: 'ar', icon: '📥' },
    { label: 'Total Payables (AP)', value: summary.totalAP, className: 'ap', icon: '📤' },
    { label: 'Current Month Profit', value: metrics.monthlyProfit, className: metrics.monthlyProfit >= 0 ? 'positive' : 'negative', icon: '📈' },
    { label: 'Fiscal Year Profit', value: summary.netProfit, className: summary.netProfit >= 0 ? 'positive' : 'negative', icon: '≡' },
  ];

  return (
    <div className="cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px' }}>
      {cards.map(card => (
        <div key={card.label} className="card">
          <div className="card-header-row">
            <h3>{card.label}</h3>
            <span className="card-icon">{card.icon}</span>
          </div>
          <p className={`amount ${card.className}`} style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            ₹{card.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default DashboardOverview;
