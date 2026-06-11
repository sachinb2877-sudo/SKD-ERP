import React, { useState } from 'react';
import { useERP } from '../hooks/useERP.js';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';

const TransactionList = ({ transactions, onDelete }) => {
  const { accounts, parties, currentUser } = useERP();
  const [deletingTxn, setDeletingTxn] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || id;
  const getPartyName = (id) => parties.find(p => p.id === id)?.name || '';

  const handleDeleteClick = (txn) => {
    setDeletingTxn(txn);
  };

  const handleDeleteConfirm = (id, reason) => {
    onDelete(id, reason);
    setDeletingTxn(null);
  };

  const canDelete = currentUser.role === 'ADMIN' || currentUser.role === 'CHECKER';

  // Apply search filtering
  const filtered = transactions.filter(txn => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    const vNo = txn.voucherNo || '';
    const remarks = txn.remarks || '';
    const partyName = txn.partyId ? getPartyName(txn.partyId) : '';
    const refNo = txn.refNo || '';
    return vNo.toLowerCase().includes(s) ||
           remarks.toLowerCase().includes(s) ||
           partyName.toLowerCase().includes(s) ||
           refNo.toLowerCase().includes(s);
  });

  if (transactions.length === 0) {
    return <div className="glass-panel text-center"><p>No transactions found.</p></div>;
  }

  return (
    <>
      <div className="search-bar-container" style={{ marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="🔍 Search by Voucher No, Party, Remarks, Ref ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            outline: 'none'
          }}
        />
      </div>

      <div className="transaction-list glass-panel">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher No</th>
                <th>Remarks</th>
                <th>Category</th>
                <th>Party</th>
                <th>Mode/Ref</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(txn => {
                const debitEntry = txn.entries?.find(e => e.debit > 0);
                const creditEntry = txn.entries?.find(e => e.credit > 0);
                const amount = debitEntry?.debit || creditEntry?.credit || 0;

                // Receipt heuristic
                const isReceipt = txn.type === 'RECEIPT' || (debitEntry && (
                  debitEntry.accountId === 'acc_cash' ||
                  debitEntry.accountId === 'acc_bank'
                ) && creditEntry && (
                  creditEntry.accountId === 'acc_milk_sales' ||
                  creditEntry.accountId === 'acc_prod_sales' ||
                  creditEntry.accountId === 'acc_other_inc' ||
                  creditEntry.accountId?.startsWith('acc_ar_')
                ));

                const statusClass = txn.status === 'APPROVED' ? 'approved'
                  : txn.status === 'PENDING' ? 'pending'
                  : txn.status === 'REJECTED' ? 'rejected' : '';

                return (
                  <tr key={txn.id} className={txn.isDeleted ? 'deleted-row' : ''}>
                    <td>{new Date(txn.date).toLocaleDateString()}</td>
                    <td>
                      <code style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 'bold' }}>
                        {txn.voucherNo || 'N/A'}
                      </code>
                    </td>
                    <td className="remarks-cell">{txn.remarks || '-'}</td>
                    <td>
                      <span className="category-badge" style={{
                        fontSize: '0.8rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        whiteSpace: 'nowrap'
                      }}>
                        {txn.category || 'General'}
                      </span>
                    </td>
                    <td>{txn.partyId ? getPartyName(txn.partyId) : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'semibold', textTransform: 'capitalize' }}>
                          {txn.paymentMode || 'CASH'}
                        </span>
                        {txn.refNo && (
                          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                            Ref: {txn.refNo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {txn.status || 'APPROVED'}
                      </span>
                    </td>
                    <td className={isReceipt ? 'positive' : 'negative'} style={{ fontWeight: '600' }}>
                      ₹{amount.toLocaleString()}
                    </td>
                    <td>
                      {canDelete && !txn.isDeleted && (
                        <button className="action-btn delete" onClick={() => handleDeleteClick(txn)}>
                          Delete
                        </button>
                      )}
                      {txn.isDeleted && (
                        <span className="deleted-label" style={{ color: '#ef4444' }}>Deleted</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center" style={{ padding: '20px' }}>
                    No matching transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTxn && (
        <DeleteConfirmModal
          transaction={deletingTxn}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingTxn(null)}
        />
      )}
    </>
  );
};

export default TransactionList;
