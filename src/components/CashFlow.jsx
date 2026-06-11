import React, { useState, useMemo } from 'react';
import { useERP } from '../hooks/useERP.js';
import { Line, Bar } from 'react-chartjs-2';

const CashFlow = () => {
  const { filteredTransactions, accounts } = useERP();
  const [filterType, setFilterType] = useState('MONTHLY'); // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // 1. Filter transactions by date range depending on selection
  const periodFilteredTxns = useMemo(() => {
    let txns = filteredTransactions;
    
    if (filterType === 'CUSTOM') {
      if (customFrom) txns = txns.filter(t => t.date >= customFrom);
      if (customTo) txns = txns.filter(t => t.date <= customTo);
      return txns;
    }
    
    // Quick relative range calculations
    const now = new Date();
    let limitDate = null;
    
    if (filterType === 'DAILY') {
      // Last 30 days
      limitDate = new Date();
      limitDate.setDate(now.getDate() - 30);
    } else if (filterType === 'WEEKLY') {
      // Last 12 weeks
      limitDate = new Date();
      limitDate.setDate(now.getDate() - 84);
    } else if (filterType === 'MONTHLY') {
      // Last 12 months
      limitDate = new Date();
      limitDate.setMonth(now.getMonth() - 12);
    } else if (filterType === 'QUARTERLY') {
      // Last 8 quarters
      limitDate = new Date();
      limitDate.setMonth(now.getMonth() - 24);
    } else if (filterType === 'YEARLY') {
      // Last 5 years
      limitDate = new Date();
      limitDate.setFullYear(now.getFullYear() - 5);
    }
    
    if (limitDate) {
      const limitStr = limitDate.toISOString().split('T')[0];
      txns = txns.filter(t => t.date >= limitStr);
    }
    
    return txns;
  }, [filteredTransactions, filterType, customFrom, customTo]);

  // 2. Classify cash flow entries
  const cashFlows = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let opInflow = 0, opOutflow = 0;
    let invInflow = 0, invOutflow = 0;
    let finInflow = 0, finOutflow = 0;

    const details = [];

    periodFilteredTxns.forEach(txn => {
      if (!txn.entries) return;

      // Check for cash/bank impact
      const cashEntry = txn.entries.find(e => e.accountId === 'acc_cash' || e.accountId === 'acc_bank');
      if (!cashEntry) return;

      const isDebit = cashEntry.debit > 0;
      const amount = isDebit ? cashEntry.debit : cashEntry.credit;

      // Find opposing entry
      const opposingEntry = txn.entries.find(e => e.accountId !== cashEntry.accountId);
      const opposingAccId = opposingEntry ? opposingEntry.accountId : '';
      const opposingAcc = accounts.find(a => a.id === opposingAccId);
      const opposingGroup = opposingAcc ? opposingAcc.group : '';
      const opposingType = opposingAcc ? opposingAcc.type : '';

      // Classification rule:
      // Fixed assets -> Investing
      // Capital/Equity/Loans -> Financing
      // Revenues/Expenses/Receivables/Payables -> Operating
      let category = 'OPERATING';
      if (opposingGroup === 'FIXED_ASSETS' || opposingAccId === 'acc_equip_asset' || opposingAccId.includes('asset')) {
        category = 'INVESTING';
      } else if (opposingGroup === 'EQUITY' || opposingAccId.includes('capital') || opposingAccId.includes('loan')) {
        category = 'FINANCING';
      }

      if (isDebit) {
        totalInflow += amount;
        if (category === 'OPERATING') opInflow += amount;
        else if (category === 'INVESTING') invInflow += amount;
        else if (category === 'FINANCING') finInflow += amount;
      } else {
        totalOutflow += amount;
        if (category === 'OPERATING') opOutflow += amount;
        else if (category === 'INVESTING') invOutflow += amount;
        else if (category === 'FINANCING') finOutflow += amount;
      }

      details.push({
        id: txn.id,
        voucherNo: txn.voucherNo,
        date: txn.date,
        remarks: txn.remarks,
        type: isDebit ? 'INFLOW' : 'OUTFLOW',
        amount,
        category,
        paymentMode: txn.paymentMode || 'CASH',
        refNo: txn.refNo
      });
    });

    // Sort by date ascending for charts
    details.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      totalInflow,
      totalOutflow,
      netCash: totalInflow - totalOutflow,
      opInflow,
      opOutflow,
      opNet: opInflow - opOutflow,
      invInflow,
      invOutflow,
      invNet: invInflow - invOutflow,
      finInflow,
      finOutflow,
      finNet: finInflow - finOutflow,
      details
    };
  }, [periodFilteredTxns, accounts]);

  // 3. Compute chart data based on filter selection
  const chartData = useMemo(() => {
    const intervals = {};
    let runningCash = 0;

    cashFlows.details.forEach(item => {
      let key = '';
      const d = new Date(item.date);
      if (filterType === 'DAILY' || filterType === 'CUSTOM') {
        key = item.date;
      } else if (filterType === 'WEEKLY') {
        // Find Sunday of that week
        const day = d.getDay();
        const diff = d.getDate() - day;
        const sunday = new Date(d.setDate(diff));
        key = sunday.toISOString().split('T')[0];
      } else if (filterType === 'MONTHLY') {
        key = item.date.slice(0, 7);
      } else if (filterType === 'QUARTERLY') {
        const q = Math.floor(d.getMonth() / 3) + 1;
        key = `${d.getFullYear()}-Q${q}`;
      } else if (filterType === 'YEARLY') {
        key = d.getFullYear().toString();
      }

      if (!intervals[key]) {
        intervals[key] = { inflow: 0, outflow: 0 };
      }

      if (item.type === 'INFLOW') {
        intervals[key].inflow += item.amount;
      } else {
        intervals[key].outflow += item.amount;
      }
    });

    const labels = Object.keys(intervals).sort();
    const inflows = labels.map(l => intervals[l].inflow);
    const outflows = labels.map(l => intervals[l].outflow);
    
    const trends = labels.map(l => {
      runningCash += (intervals[l].inflow - intervals[l].outflow);
      return runningCash;
    });

    return {
      barData: {
        labels,
        datasets: [
          {
            label: 'Inflow',
            data: inflows,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 4
          },
          {
            label: 'Outflow',
            data: outflows,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderRadius: 4
          }
        ]
      },
      lineData: {
        labels,
        datasets: [
          {
            label: 'Net Cumulative Cash',
            data: trends,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            fill: true,
            tension: 0.4
          }
        ]
      }
    };
  }, [cashFlows, filterType]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: '#f8fafc' } } },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
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
    <div className="cashflow-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Date Filter Panel */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`action-btn ${filterType === t ? 'primary-btn' : ''}`}
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              {t}
            </button>
          ))}
        </div>

        {filterType === 'CUSTOM' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            />
            <span style={{ color: '#94a3b8' }}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            />
          </div>
        )}
      </div>

      {/* Cash Flow Statement Summary Cards */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Operating Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operating Activities</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '10px 0', color: cashFlows.opNet >= 0 ? '#10b981' : '#ef4444' }}>
            ₹{cashFlows.opNet.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span>Inflow: ₹{cashFlows.opInflow.toLocaleString()}</span>
            <span>Outflow: ₹{cashFlows.opOutflow.toLocaleString()}</span>
          </div>
        </div>

        {/* Investing Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Investing Activities</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '10px 0', color: cashFlows.invNet >= 0 ? '#10b981' : '#ef4444' }}>
            ₹{cashFlows.invNet.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span>Inflow: ₹{cashFlows.invInflow.toLocaleString()}</span>
            <span>Outflow: ₹{cashFlows.invOutflow.toLocaleString()}</span>
          </div>
        </div>

        {/* Financing Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financing Activities</h4>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '10px 0', color: cashFlows.finNet >= 0 ? '#10b981' : '#ef4444' }}>
            ₹{cashFlows.finNet.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span>Inflow: ₹{cashFlows.finInflow.toLocaleString()}</span>
            <span>Outflow: ₹{cashFlows.finOutflow.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Totals Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '20px', flexWrap: 'wrap', gap: '20px', textAlign: 'center', background: 'rgba(96,165,250,0.08)' }}>
        <div>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Cash Inflow</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#10b981', marginTop: '5px' }}>₹{cashFlows.totalInflow.toLocaleString()}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '40px' }} className="hide-mobile"></div>
        <div>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Total Cash Outflow</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#ef4444', marginTop: '5px' }}>₹{cashFlows.totalOutflow.toLocaleString()}</div>
        </div>
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '40px' }} className="hide-mobile"></div>
        <div>
          <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Net Cash Position</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa', marginTop: '5px' }}>₹{cashFlows.netCash.toLocaleString()}</div>
        </div>
      </div>

      {/* Chart Segment */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div className="chart-wrapper glass-panel" style={{ padding: '20px', height: '320px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Inflow vs Outflow</h3>
          <div style={{ height: '240px', position: 'relative' }}>
            {chartData.barData.labels.length > 0 ? (
              <Bar data={chartData.barData} options={barOptions} />
            ) : (
              <p className="text-center text-secondary" style={{ paddingTop: '80px' }}>No cash flows recorded in this period.</p>
            )}
          </div>
        </div>

        <div className="chart-wrapper glass-panel" style={{ padding: '20px', height: '320px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Cash Trend (Cumulative)</h3>
          <div style={{ height: '240px', position: 'relative' }}>
            {chartData.lineData.labels.length > 0 ? (
              <Line data={chartData.lineData} options={lineOptions} />
            ) : (
              <p className="text-center text-secondary" style={{ paddingTop: '80px' }}>No cash flows recorded in this period.</p>
            )}
          </div>
        </div>
      </div>

      {/* Details Table */}
      <div className="transaction-list glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Cash Flow Transaction Details</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher No</th>
                <th>Remarks</th>
                <th>Activity</th>
                <th>Mode</th>
                <th>Reference</th>
                <th className="text-right">Flow Type</th>
                <th className="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {cashFlows.details.slice().reverse().map(item => (
                <tr key={item.id}>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td><code style={{ color: '#60a5fa', fontWeight: 'bold' }}>{item.voucherNo}</code></td>
                  <td>{item.remarks}</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: item.category === 'OPERATING' ? 'rgba(59,130,246,0.15)' : item.category === 'INVESTING' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
                      color: item.category === 'OPERATING' ? '#60a5fa' : item.category === 'INVESTING' ? '#c084fc' : '#f59e0b'
                    }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{item.paymentMode.toLowerCase()}</td>
                  <td>{item.refNo || '-'}</td>
                  <td className="text-right">
                    <span style={{ color: item.type === 'INFLOW' ? '#10b981' : '#ef4444', fontWeight: 'semibold', fontSize: '0.85rem' }}>
                      {item.type}
                    </span>
                  </td>
                  <td className="text-right font-semibold" style={{ color: item.type === 'INFLOW' ? '#10b981' : '#ef4444' }}>
                    {item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {cashFlows.details.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center" style={{ padding: '20px' }}>
                    No cash flow logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default CashFlow;
