import React, { useState, useMemo } from 'react';
import { useERP } from '../hooks/useERP.js';

const BankReconciliation = () => {
  const { transactions, accounts, reconcileTransaction, unreconcileTransaction } = useERP();
  const [bankStatement, setBankStatement] = useState([]); // [{ date, refNo, remarks, amount, type }]
  const [fileName, setFileName] = useState('');
  const [reconcileFilter, setReconcileFilter] = useState('UNRECONCILED'); // UNRECONCILED, RECONCILED, ALL

  // ERP Bank Account transactions list (approved, non-deleted entries hitting acc_bank)
  const erpBankTransactions = useMemo(() => {
    const list = [];
    transactions.forEach(txn => {
      if (txn.status !== 'APPROVED' || txn.isDeleted || !txn.entries) return;
      
      const bankEntry = txn.entries.find(e => e.accountId === 'acc_bank');
      if (bankEntry) {
        const isReceipt = bankEntry.debit > 0;
        list.push({
          id: txn.id,
          date: txn.date,
          voucherNo: txn.voucherNo,
          remarks: txn.remarks,
          amount: isReceipt ? bankEntry.debit : bankEntry.credit,
          type: isReceipt ? 'DEPOSIT' : 'WITHDRAWAL', // ERP debit is deposit, credit is withdrawal
          reconciledStatus: txn.reconciledStatus || 'UNRECONCILED',
          clearanceDate: txn.clearanceDate || '',
          refNo: txn.refNo || ''
        });
      }
    });
    return list;
  }, [transactions]);

  // ERP Bank Balance calculation
  const erpBankBalance = useMemo(() => {
    let bal = 0;
    transactions.forEach(txn => {
      if (txn.status !== 'APPROVED' || txn.isDeleted || !txn.entries) return;
      txn.entries.forEach(e => {
        if (e.accountId === 'acc_bank') {
          bal += (e.debit - e.credit);
        }
      });
    });
    return bal;
  }, [transactions]);

  // Load a mock bank statement for demonstration
  const handleLoadSampleStatement = () => {
    // Generate mock statement based on dates around current ERP transactions for easy matching
    const sample = [
      { date: new Date().toISOString().split('T')[0], refNo: 'CHQ-100234', remarks: 'Milk Supplier Payment Clear', amount: 25000, type: 'WITHDRAWAL' },
      { date: new Date().toISOString().split('T')[0], refNo: 'UPI-99887', remarks: 'Customer Receipt UPI Clear', amount: 12000, type: 'DEPOSIT' },
      { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], refNo: 'TXN-00918', remarks: 'Direct Office Expense Debited', amount: 3500, type: 'WITHDRAWAL' },
      { date: new Date(Date.now() - 172800000).toISOString().split('T')[0], refNo: 'UPI-30041', remarks: 'Direct Milk Sale Received', amount: 8000, type: 'DEPOSIT' }
    ];
    setBankStatement(sample);
    setFileName('sample_statement.csv');
  };

  // CSV Drag and Drop Parser
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').slice(1); // Skip header row
      const parsed = rows.map(row => {
        const cols = row.split(',');
        if (cols.length < 5) return null;
        return {
          date: cols[0]?.trim(),
          refNo: cols[1]?.trim(),
          remarks: cols[2]?.trim(),
          amount: parseFloat(cols[3]?.trim()) || 0,
          type: cols[4]?.trim().toUpperCase() // DEPOSIT or WITHDRAWAL
        };
      }).filter(Boolean);

      setBankStatement(parsed);
    };
    reader.readAsText(file);
  };

  // Reconciled statement details comparison metrics
  const reconciliationSummary = useMemo(() => {
    const reconciledList = erpBankTransactions.filter(t => t.reconciledStatus === 'RECONCILED');
    const unreconciledList = erpBankTransactions.filter(t => t.reconciledStatus === 'UNRECONCILED');

    const totalReconciledAmt = reconciledList.reduce((s, t) => s + (t.type === 'DEPOSIT' ? t.amount : -t.amount), 0);
    
    // Attempt automatic match recommendation
    const suggestedMatches = [];
    
    unreconciledList.forEach(erp => {
      // Find bank statement rows matching amount, type, and within +/- 3 days or refNo
      const match = bankStatement.find(bank => {
        const amtMatch = bank.amount === erp.amount;
        const typeMatch = bank.type === erp.type;
        const refMatch = erp.refNo && bank.refNo && bank.refNo.toLowerCase().includes(erp.refNo.toLowerCase());
        
        const dateDiff = Math.abs(new Date(bank.date) - new Date(erp.date)) / (1000 * 60 * 60 * 24);
        const closeDate = dateDiff <= 3;

        return amtMatch && typeMatch && (refMatch || closeDate);
      });

      if (match) {
        suggestedMatches.push({ erp, bank: match });
      }
    });

    return {
      reconciledList,
      unreconciledList,
      erpBankBalance,
      bankStatementBalance: totalReconciledAmt, // Simulated cleared balance
      suggestedMatches
    };
  }, [erpBankTransactions, bankStatement, erpBankBalance]);

  return (
    <div className="bank-reconcile-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* File Import Zone */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Import Bank Statement</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Upload your monthly bank statement (CSV format with Date, RefNo, Description, Amount, FlowType columns)
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={handleLoadSampleStatement} className="action-btn" style={{ fontSize: '0.85rem' }}>
            Load Demo Statement
          </button>
          
          <label className="primary-btn" style={{ fontSize: '0.85rem', padding: '8px 16px', cursor: 'pointer' }}>
            📁 Upload CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {fileName && (
        <div style={{ color: '#60a5fa', fontSize: '0.85rem', marginTop: '-10px', paddingLeft: '10px' }}>
          📄 Active File: <strong>{fileName}</strong> ({bankStatement.length} rows loaded)
        </div>
      )}

      {/* Balance reconciliation widgets */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* ERP Balance Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>ERP Bank Balance</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#60a5fa' }}>
            ₹{erpBankBalance.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Based on approved journal ledgers</span>
        </div>

        {/* Cleared Balance Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>Cleared Bank Balance</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
            ₹{reconciliationSummary.bankStatementBalance.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sum of all reconciled clearance dates</span>
        </div>

        {/* Discrepancy Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>Difference (Unreconciled)</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: (erpBankBalance - reconciliationSummary.bankStatementBalance) === 0 ? '#10b981' : '#f59e0b' }}>
            ₹{(erpBankBalance - reconciliationSummary.bankStatementBalance).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Outstanding deposits or uncleared payouts</span>
        </div>
      </div>

      {/* Suggested Matches Banner */}
      {reconciliationSummary.suggestedMatches.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <h4 style={{ color: '#f59e0b', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✨ Recommended Match Auto-Detections ({reconciliationSummary.suggestedMatches.length})
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 15px 0' }}>
            We found matching transactions in your statement and ERP by matching dates and amount metrics.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reconciliationSummary.suggestedMatches.map((match, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 15px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <strong style={{ color: '#fff' }}>ERP Voucher:</strong> {match.erp.voucherNo} ({match.erp.remarks}) <br />
                  <span style={{ color: '#94a3b8' }}>Date: {new Date(match.erp.date).toLocaleDateString()} | Amt: ₹{match.erp.amount.toLocaleString()}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '1.2rem' }}>⇆</div>
                <div>
                  <strong style={{ color: '#fff' }}>Statement Line:</strong> {match.bank.remarks} <br />
                  <span style={{ color: '#94a3b8' }}>Date: {new Date(match.bank.date).toLocaleDateString()} | Ref: {match.bank.refNo}</span>
                </div>
                <button
                  onClick={() => reconcileTransaction(match.erp.id, match.bank.date)}
                  className="primary-btn"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Confirm Match
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs / Filters */}
      <div className="glass-panel" style={{ display: 'flex', gap: '15px', padding: '10px 20px' }}>
        {['UNRECONCILED', 'RECONCILED', 'ALL'].map(f => (
          <button
            key={f}
            onClick={() => setReconcileFilter(f)}
            className={`action-btn ${reconcileFilter === f ? 'primary-btn' : ''}`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
          >
            {f} Entries
          </button>
        ))}
      </div>

      {/* Table grid */}
      <div className="transaction-list glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>ERP Ledger Reconciliation Registry</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher No</th>
                <th>Remarks</th>
                <th>Flow Type</th>
                <th className="text-right">Amount (₹)</th>
                <th>ERP Reference</th>
                <th>Status</th>
                <th>Cleared Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {erpBankTransactions
                .filter(t => {
                  if (reconcileFilter === 'UNRECONCILED') return t.reconciledStatus === 'UNRECONCILED';
                  if (reconcileFilter === 'RECONCILED') return t.reconciledStatus === 'RECONCILED';
                  return true;
                })
                .map(txn => {
                  const isReconciled = txn.reconciledStatus === 'RECONCILED';
                  
                  return (
                    <tr key={txn.id}>
                      <td>{new Date(txn.date).toLocaleDateString()}</td>
                      <td><code style={{ color: '#60a5fa', fontWeight: 'bold' }}>{txn.voucherNo}</code></td>
                      <td>{txn.remarks}</td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: txn.type === 'DEPOSIT' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: txn.type === 'DEPOSIT' ? '#10b981' : '#f87171'
                        }}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="text-right font-semibold">₹{txn.amount.toLocaleString()}</td>
                      <td><code>{txn.refNo || '-'}</code></td>
                      <td>
                        <span style={{
                          color: isReconciled ? '#10b981' : '#ef4444',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}>
                          {txn.reconciledStatus}
                        </span>
                      </td>
                      <td>{txn.clearanceDate ? new Date(txn.clearanceDate).toLocaleDateString() : '-'}</td>
                      <td>
                        {isReconciled ? (
                          <button
                            onClick={() => unreconcileTransaction(txn.id)}
                            className="action-btn delete"
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const clearDate = prompt('Enter Bank Clearance Date (YYYY-MM-DD):', txn.date);
                              if (clearDate) {
                                reconcileTransaction(txn.id, clearDate);
                              }
                            }}
                            className="primary-btn"
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          >
                            Mark Cleared
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {erpBankTransactions.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center" style={{ padding: '20px' }}>
                    No bank ledger transactions found.
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

export default BankReconciliation;
