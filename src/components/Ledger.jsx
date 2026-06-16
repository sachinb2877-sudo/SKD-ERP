import React, { useState, useMemo } from 'react';
import { useERP } from '../hooks/useERP.js';
import { computeAccountLedger } from '../utils/calculations.js';

const Ledger = () => {
  const { accounts, parties, transactions, filteredTransactions } = useERP();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');

  // When a party is selected, auto-select their linked account
  const handlePartyChange = (pid) => {
    setSelectedPartyId(pid);
    if (pid) {
      const party = parties.find(p => p.id === pid);
      if (party) {
        const accId = party.receivableAccountId || party.payableAccountId || '';
        setSelectedAccountId(accId);
      }
    }
  };

  // Compute ledger entries
  const ledgerEntries = useMemo(() => {
    if (!selectedAccountId) return [];

    // Use all transactions (ledger is historical), but we can also respect fiscal year
    return computeAccountLedger(filteredTransactions, selectedAccountId);
  }, [filteredTransactions, selectedAccountId]);

  const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);

  // Group accounts for a nicer dropdown
  const groupedAccounts = useMemo(() => {
    const groups = {};
    accounts.forEach(acc => {
      const g = acc.group || 'OTHER';
      if (!groups[g]) groups[g] = [];
      groups[g].push(acc);
    });
    return groups;
  }, [accounts]);

  const getPartyName = (id) => parties.find(p => p.id === id)?.name || '';

  return (
    <div className="ledger-container">
      {/* Filters */}
      <div className="ledger-filters glass-panel">
        <div className="form-group">
          <label>Filter by Account</label>
          <select value={selectedAccountId} onChange={e => { setSelectedAccountId(e.target.value); setSelectedPartyId(''); }}>
            <option value="">— Select an Account —</option>
            {Object.entries(groupedAccounts).map(([group, accs]) => (
              <optgroup key={group} label={group}>
                {accs.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Filter by Party</label>
          <select value={selectedPartyId} onChange={e => handlePartyChange(e.target.value)}>
            <option value="">— All Parties —</option>
            {parties.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      {!selectedAccountId ? (
        <div className="glass-panel text-center ledger-empty">
          <p className="ledger-empty-icon">📒</p>
          <p>Select an account to view its ledger.</p>
          <p className="text-secondary">The ledger shows a chronological record of all debits and credits for the selected account.</p>
        </div>
      ) : ledgerEntries.length === 0 ? (
        <div className="glass-panel text-center ledger-empty">
          <p>No entries found for this account in the selected period.</p>
        </div>
      ) : (
        <div className="transaction-list glass-panel">
          <div className="table-responsive">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Remarks</th>
                  <th>Party</th>
                  <th className="text-right">Debit (₹)</th>
                  <th className="text-right">Credit (₹)</th>
                  <th className="text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, idx) => (
                  <tr key={`${entry.txnId}-${idx}`}>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="remarks-cell">{entry.remarks}</td>
                    <td>{entry.partyId ? getPartyName(entry.partyId) : '-'}</td>
                    <td className="text-right">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                    <td className="text-right">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                    <td className={`text-right font-semibold ${entry.balance >= 0 ? 'positive' : 'negative'}`}>
                      {entry.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="ledger-totals-row">
                  <td colSpan="3"><strong>Totals</strong></td>
                  <td className="text-right"><strong>{totalDebit.toLocaleString()}</strong></td>
                  <td className="text-right"><strong>{totalCredit.toLocaleString()}</strong></td>
                  <td className={`text-right font-semibold ${(totalDebit - totalCredit) >= 0 ? 'positive' : 'negative'}`}>
                    <strong>{(totalDebit - totalCredit).toLocaleString()}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
