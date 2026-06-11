import React, { useState, useMemo } from 'react';
import { useERP } from '../hooks/useERP.js';

const Outstanding = () => {
  const { transactions, parties } = useERP();
  const [partyTypeFilter, setPartyTypeFilter] = useState('ALL'); // ALL, CUSTOMER, VENDOR
  const [agingFilter, setAgingFilter] = useState('ALL'); // ALL, OVERDUE, AGING_60

  // FIFO Aging Calculation for all parties
  const outstandingReport = useMemo(() => {
    const today = new Date();
    let totalReceivable = 0;
    let totalPayable = 0;
    let totalOverdue = 0;

    const data = parties.map(party => {
      const accountId = party.type === 'CUSTOMER' ? `acc_ar_${party.id}` : `acc_ap_${party.id}`;

      // 1. Gather all ledger entries for this party's AP/AR account
      const postings = [];
      transactions.forEach(txn => {
        if (txn.status !== 'APPROVED' || txn.isDeleted || !txn.entries) return;
        txn.entries.forEach(e => {
          if (e.accountId === accountId) {
            postings.push({
              date: txn.date,
              debit: e.debit,
              credit: e.credit,
              voucherNo: txn.voucherNo
            });
          }
        });
      });

      // Sort chronologically
      postings.sort((a, b) => new Date(a.date) - new Date(b.date));

      // 2. FIFO Matching of Invoices/Bills against Payments
      const documents = [];
      let totalSalesOrPurchases = 0;
      let totalPayments = 0;

      if (party.type === 'CUSTOMER') {
        postings.forEach(p => {
          if (p.debit > 0) {
            documents.push({ date: p.date, voucherNo: p.voucherNo, amount: p.debit, unpaid: p.debit });
            totalSalesOrPurchases += p.debit;
          }
          if (p.credit > 0) {
            totalPayments += p.credit;
          }
        });
      } else {
        postings.forEach(p => {
          if (p.credit > 0) {
            documents.push({ date: p.date, voucherNo: p.voucherNo, amount: p.credit, unpaid: p.credit });
            totalSalesOrPurchases += p.credit;
          }
          if (p.debit > 0) {
            totalPayments += p.debit;
          }
        });
      }

      // Allocate payments FIFO
      let remainingPayments = totalPayments;
      for (let i = 0; i < documents.length && remainingPayments > 0; i++) {
        const allocate = Math.min(documents[i].unpaid, remainingPayments);
        documents[i].unpaid -= allocate;
        remainingPayments -= allocate;
      }

      // 3. Populate aging buckets
      let aging30 = 0; // 0-30 days
      let aging60 = 0; // 31-60 days
      let agingOver60 = 0; // 61+ days
      let overdue = 0; // Overdue is any unpaid doc older than 30 days
      let balance = 0;

      documents.forEach(doc => {
        if (doc.unpaid <= 0) return;
        balance += doc.unpaid;

        const docDate = new Date(doc.date);
        const ageInDays = Math.ceil(Math.abs(today - docDate) / (1000 * 60 * 60 * 24));

        if (ageInDays <= 30) {
          aging30 += doc.unpaid;
        } else if (ageInDays <= 60) {
          aging60 += doc.unpaid;
          overdue += doc.unpaid; // 30+ days overdue
        } else {
          agingOver60 += doc.unpaid;
          overdue += doc.unpaid; // 30+ days overdue
        }
      });

      if (party.type === 'CUSTOMER') {
        totalReceivable += balance;
      } else {
        totalPayable += balance;
      }
      totalOverdue += overdue;

      return {
        partyId: party.id,
        name: party.name,
        type: party.type,
        totalBilled: totalSalesOrPurchases,
        totalPaid: totalPayments,
        outstanding: balance,
        aging30,
        aging60,
        agingOver60,
        overdue
      };
    });

    return {
      totalReceivable,
      totalPayable,
      totalOverdue,
      partiesOutstanding: data
    };
  }, [transactions, parties]);

  // Apply filters
  const filteredReport = useMemo(() => {
    let rows = outstandingReport.partiesOutstanding;

    if (partyTypeFilter !== 'ALL') {
      rows = rows.filter(r => r.type === partyTypeFilter);
    }

    if (agingFilter === 'OVERDUE') {
      rows = rows.filter(r => r.overdue > 0);
    } else if (agingFilter === 'AGING_60') {
      rows = rows.filter(r => r.agingOver60 > 0);
    }

    return rows;
  }, [outstandingReport, partyTypeFilter, agingFilter]);

  return (
    <div className="outstanding-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner KPI Cards */}
      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Receivables Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Receivables (AR)</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#10b981' }}>
            ₹{outstandingReport.totalReceivable.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Due from Customer Party Accounts</span>
        </div>

        {/* Payables Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Payables (AP)</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#ef4444' }}>
            ₹{outstandingReport.totalPayable.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Due to Vendor/Supplier Party Accounts</span>
        </div>

        {/* Overdue Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overdue Invoices (&gt;30 Days)</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#f59e0b' }}>
            ₹{outstandingReport.totalOverdue.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Subject to collection/payment notices</span>
        </div>
      </div>

      {/* Filters Segment */}
      <div className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '15px 20px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Party Type</label>
          <select value={partyTypeFilter} onChange={e => setPartyTypeFilter(e.target.value)} style={{ padding: '6px 12px', width: '100%' }}>
            <option value="ALL">All Parties</option>
            <option value="CUSTOMER">Customers (Receivables)</option>
            <option value="VENDOR">Vendors (Payables)</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Aging Focus</label>
          <select value={agingFilter} onChange={e => setAgingFilter(e.target.value)} style={{ padding: '6px 12px', width: '100%' }}>
            <option value="ALL">All Balances</option>
            <option value="OVERDUE">Overdue Only (&gt;30 Days)</option>
            <option value="AGING_60">Critical Only (&gt;60 Days)</option>
          </select>
        </div>
      </div>

      {/* Outstanding Ledger Summary table */}
      <div className="transaction-list glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Party Wise Outstanding Ledgers</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Type</th>
                <th className="text-right">Total Invoiced/Billed</th>
                <th className="text-right">Total Settled</th>
                <th className="text-right">Net Outstanding</th>
                <th className="text-right">0 - 30 Days</th>
                <th className="text-right">31 - 60 Days</th>
                <th className="text-right">61+ Days</th>
                <th>Overdue Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReport.map(row => {
                const statusBadge = row.outstanding === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '4px' }}>Settled</span>
                ) : row.overdue > 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    Overdue ({row.overdue > 0 ? Math.round((row.overdue / row.outstanding) * 100) : 0}%)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>Active</span>
                );

                return (
                  <tr key={row.partyId}>
                    <td><strong>{row.name}</strong></td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: row.type === 'CUSTOMER' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: row.type === 'CUSTOMER' ? '#10b981' : '#f87171'
                      }}>
                        {row.type}
                      </span>
                    </td>
                    <td className="text-right">₹{row.totalBilled.toLocaleString()}</td>
                    <td className="text-right">₹{row.totalPaid.toLocaleString()}</td>
                    <td className="text-right font-semibold" style={{ color: row.type === 'CUSTOMER' ? '#10b981' : '#f87171' }}>
                      ₹{row.outstanding.toLocaleString()}
                    </td>
                    <td className="text-right">₹{row.aging30.toLocaleString()}</td>
                    <td className="text-right" style={{ color: row.aging60 > 0 ? '#f59e0b' : 'inherit' }}>
                      ₹{row.aging60.toLocaleString()}
                    </td>
                    <td className="text-right font-semibold" style={{ color: row.agingOver60 > 0 ? '#ef4444' : 'inherit' }}>
                      ₹{row.agingOver60.toLocaleString()}
                    </td>
                    <td>{statusBadge}</td>
                  </tr>
                );
              })}
              {filteredReport.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center" style={{ padding: '20px' }}>
                    No outstanding records found matching filters.
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

export default Outstanding;
