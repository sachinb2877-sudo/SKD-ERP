import React, { useMemo } from 'react';
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
  const { filteredTransactions, accounts, parties } = useERP();

  // 1. Monthly Income vs Expense Trend
  const monthlyData = useMemo(() => {
    const data = {};
    filteredTransactions.forEach(txn => {
      const month = new Date(txn.date).toISOString().slice(0, 7);
      if (!data[month]) data[month] = { income: 0, expense: 0 };

      if (txn.entries) {
        txn.entries.forEach(entry => {
          const acc = accounts.find(a => a.id === entry.accountId);
          if (!acc) return;
          if (acc.group === 'INCOME') data[month].income += (entry.credit - entry.debit);
          if (acc.group === 'EXPENSE') data[month].expense += (entry.debit - entry.credit);
        });
      }
    });
    return data;
  }, [filteredTransactions, accounts]);

  const sortedMonths = useMemo(() => Object.keys(monthlyData).sort(), [monthlyData]);

  const barData = {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Income',
        data: sortedMonths.map(m => monthlyData[m].income),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
      },
      {
        label: 'Expense',
        data: sortedMonths.map(m => monthlyData[m].expense),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
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

  // 2. Expense Category breakdown
  const expenseBreakdown = useMemo(() => {
    const breakdown = {};
    filteredTransactions.forEach(txn => {
      if (txn.isDeleted || !txn.entries) return;
      txn.entries.forEach(entry => {
        const acc = accounts.find(a => a.id === entry.accountId);
        if (acc && acc.group === 'EXPENSE') {
          const cat = txn.category || 'Other';
          breakdown[cat] = (breakdown[cat] || 0) + (entry.debit - entry.credit);
        }
      });
    });
    return breakdown;
  }, [filteredTransactions, accounts]);

  const doughnutData = {
    labels: Object.keys(expenseBreakdown),
    datasets: [
      {
        data: Object.values(expenseBreakdown),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#6366f1', '#f43f5e', '#a855f7'],
        borderColor: '#0f172a',
        borderWidth: 2,
      }
    ]
  };

  // 3. Revenue Growth Trend (Line chart of Income)
  const revenueGrowthData = useMemo(() => {
    const growth = {};
    filteredTransactions.forEach(txn => {
      if (txn.isDeleted || !txn.entries) return;
      txn.entries.forEach(entry => {
        const acc = accounts.find(a => a.id === entry.accountId);
        if (acc && acc.group === 'INCOME') {
          const month = new Date(txn.date).toISOString().slice(0, 7);
          growth[month] = (growth[month] || 0) + (entry.credit - entry.debit);
        }
      });
    });
    return growth;
  }, [filteredTransactions, accounts]);

  const sortedRevMonths = useMemo(() => Object.keys(revenueGrowthData).sort(), [revenueGrowthData]);

  const lineData = {
    labels: sortedRevMonths,
    datasets: [
      {
        label: 'Revenue Trend',
        data: sortedRevMonths.map(m => revenueGrowthData[m]),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
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

  // 4. Top Customers & Top Vendors
  const topParties = useMemo(() => {
    const custMap = {};
    const vendMap = {};

    filteredTransactions.forEach(txn => {
      if (txn.isDeleted || !txn.partyId) return;
      
      const party = parties.find(p => p.id === txn.partyId);
      if (!party) return;

      // Extract amount
      const debitEntry = txn.entries?.find(e => e.debit > 0);
      const creditEntry = txn.entries?.find(e => e.credit > 0);
      const amt = debitEntry?.debit || creditEntry?.credit || 0;

      if (party.type === 'CUSTOMER') {
        custMap[party.name] = (custMap[party.name] || 0) + amt;
      } else {
        vendMap[party.name] = (vendMap[party.name] || 0) + amt;
      }
    });

    const topCustomers = Object.entries(custMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topVendors = Object.entries(vendMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return { topCustomers, topVendors };
  }, [filteredTransactions, parties]);

  return (
    <div className="analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top row - Income vs Expense Trend */}
      <div className="chart-wrapper glass-panel main-chart" style={{ padding: '20px', height: '320px' }}>
        <h3>Income vs Expenses Trend</h3>
        <div style={{ height: '240px', position: 'relative' }}>
          {sortedMonths.length > 0
            ? <Bar options={barOptions} data={barData} />
            : <p className="text-center text-secondary" style={{ paddingTop: '80px' }}>No trend data available.</p>
          }
        </div>
      </div>

      {/* Grid of details */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Expense Category Breakdown */}
        <div className="chart-wrapper glass-panel" style={{ padding: '20px', height: '320px' }}>
          <h3>Expense Category Breakdown</h3>
          <div style={{ height: '240px', position: 'relative' }}>
            {Object.keys(expenseBreakdown).length > 0
              ? <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#f8fafc' } } } }} />
              : <p className="text-center text-secondary" style={{ paddingTop: '80px' }}>No expense category logs found.</p>
            }
          </div>
        </div>

        {/* Revenue Growth Trend */}
        <div className="chart-wrapper glass-panel" style={{ padding: '20px', height: '320px' }}>
          <h3>Revenue Growth & Performance</h3>
          <div style={{ height: '240px', position: 'relative' }}>
            {sortedRevMonths.length > 0
              ? <Line options={lineOptions} data={lineData} />
              : <p className="text-center text-secondary" style={{ paddingTop: '80px' }}>No revenue trend data available.</p>
            }
          </div>
        </div>
      </div>

      {/* Top Parties details list */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Top Customers */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>⭐ Top Customers</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Customer Name</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total Volume (₹)</th>
                </tr>
              </thead>
              <tbody>
                {topParties.topCustomers.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 8px' }}>{c.name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>
                      ₹{c.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {topParties.topCustomers.length === 0 && (
                  <tr>
                    <td colSpan="2" className="text-center text-secondary" style={{ padding: '15px' }}>No customer data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Vendors */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>🌾 Top Vendors (Suppliers)</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Vendor Name</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total Procurement (₹)</th>
                </tr>
              </thead>
              <tbody>
                {topParties.topVendors.map((v, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 8px' }}>{v.name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#f87171' }}>
                      ₹{v.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {topParties.topVendors.length === 0 && (
                  <tr>
                    <td colSpan="2" className="text-center text-secondary" style={{ padding: '15px' }}>No vendor data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
