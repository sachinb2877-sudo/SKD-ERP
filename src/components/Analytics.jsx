import React from 'react';
import { useERP } from '../hooks/useERP.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const { filteredTransactions, accounts } = useERP();

  // ── Monthly income vs expense ───────────────────────────────
  const monthlyData = {};
  filteredTransactions.forEach(txn => {
    const month = new Date(txn.date).toISOString().slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };

    if (txn.entries) {
      txn.entries.forEach(entry => {
        const acc = accounts.find(a => a.id === entry.accountId);
        if (!acc) return;
        if (acc.group === 'INCOME') monthlyData[month].income += (entry.credit - entry.debit);
        if (acc.group === 'EXPENSE') monthlyData[month].expense += (entry.debit - entry.credit);
      });
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();

  const barData = {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Income',
        data: sortedMonths.map(m => monthlyData[m].income),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Expense',
        data: sortedMonths.map(m => monthlyData[m].expense),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderRadius: 4,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: '#f8fafc' } } },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  // ── Category breakdown ──────────────────────────────────────
  const expenseBreakdown = {};
  filteredTransactions.forEach(txn => {
    if (!txn.entries) return;
    const hasExpense = txn.entries.some(e => e.accountId === 'acc_expense' && e.debit > 0);
    if (hasExpense) {
      const amt = txn.entries.find(e => e.accountId === 'acc_expense')?.debit || 0;
      const cat = txn.category || 'Other';
      expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
    }
  });

  const doughnutData = {
    labels: Object.keys(expenseBreakdown),
    datasets: [
      {
        data: Object.values(expenseBreakdown),
        backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f43f5e', '#06b6d4'],
        borderColor: '#0f172a',
        borderWidth: 2,
      }
    ]
  };

  // ── Investment growth ───────────────────────────────────────
  const investmentData = {};
  filteredTransactions.forEach(txn => {
    if (txn.category === 'Investment' && txn.entries) {
      const expEntry = txn.entries.find(e => e.accountId === 'acc_expense' && e.debit > 0);
      if (expEntry) {
        const month = new Date(txn.date).toISOString().slice(0, 7);
        investmentData[month] = (investmentData[month] || 0) + expEntry.debit;
      }
    }
  });

  const sortedInvMonths = Object.keys(investmentData).sort();
  let cumulativeInv = 0;
  const cumulativeData = sortedInvMonths.map(m => {
    cumulativeInv += investmentData[m];
    return cumulativeInv;
  });

  const lineData = {
    labels: sortedInvMonths,
    datasets: [
      {
        label: 'Total Investment',
        data: cumulativeData,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: '#f8fafc' } } },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  return (
    <div className="analytics-container">
      <div className="chart-wrapper glass-panel main-chart">
        <h3>Income vs Expenses Trend</h3>
        <div className="chart-canvas-container">
          {sortedMonths.length > 0
            ? <Bar options={barOptions} data={barData} />
            : <p className="text-center text-secondary" style={{ paddingTop: '2rem' }}>No data available for trend chart.</p>
          }
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-wrapper glass-panel">
          <h3>Expense Breakdown</h3>
          <div className="chart-canvas-container pie-container">
            {Object.keys(expenseBreakdown).length > 0
              ? <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#f8fafc' } } } }} />
              : <p className="text-center text-secondary" style={{ paddingTop: '2rem' }}>No expense data available.</p>
            }
          </div>
        </div>

        <div className="chart-wrapper glass-panel">
          <h3>Investment Growth</h3>
          <div className="chart-canvas-container">
            {sortedInvMonths.length > 0
              ? <Line options={lineOptions} data={lineData} />
              : <p className="text-center text-secondary" style={{ paddingTop: '2rem' }}>No investment data available.</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
