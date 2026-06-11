import React, { useState } from 'react';
import { useERP } from '../hooks/useERP.js';

/**
 * ApprovalQueue — Checker interface for the Maker-Checker workflow.
 * Shows all PENDING transactions. Checker can Approve or Reject (with notes).
 */
const ApprovalQueue = () => {
  const { pendingTransactions, accounts, parties, approveTransaction, rejectTransaction, currentUser } = useERP();

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const getAccountName = (id) => accounts.find(a => a.id === id)?.name || id;
  const getPartyName = (id) => parties.find(p => p.id === id)?.name || '';

  const handleApprove = (id) => {
    approveTransaction(id);
  };

  const handleReject = (id) => {
    if (!rejectionNote.trim()) return alert('Please enter a rejection reason.');
    rejectTransaction(id, rejectionNote.trim());
    setRejectingId(null);
    setRejectionNote('');
  };

  const isChecker = currentUser.role === 'ADMIN' || currentUser.role === 'CHECKER';

  return (
    <div className="approval-queue">
      <div className="approval-header">
        <h3 className="section-title">Pending Approvals</h3>
        <span className="approval-count-badge">
          {pendingTransactions.length} pending
        </span>
      </div>

      {!isChecker && (
        <div className="glass-panel approval-notice">
          <p>🔒 You need <strong>Admin</strong> or <strong>Checker</strong> role to approve or reject transactions.</p>
          <p className="text-secondary">Current role: {currentUser.role}</p>
        </div>
      )}

      {pendingTransactions.length === 0 ? (
        <div className="glass-panel text-center approval-empty">
          <p className="approval-empty-icon">✅</p>
          <p>No pending approvals.</p>
          <p className="text-secondary">All transactions have been reviewed.</p>
        </div>
      ) : (
        <div className="approval-cards">
          {pendingTransactions.map(txn => {
            const debitEntry = txn.entries?.find(e => e.debit > 0);
            const creditEntry = txn.entries?.find(e => e.credit > 0);
            const amount = debitEntry?.debit || creditEntry?.credit || 0;

            return (
              <div key={txn.id} className="approval-card glass-panel">
                <div className="approval-card-top">
                  <div className="approval-card-info">
                    <span className="approval-status-badge pending">Pending</span>
                    <span className="approval-date">{new Date(txn.date).toLocaleDateString()}</span>
                    <span className="approval-creator">by {txn.createdBy || 'Unknown'}</span>
                  </div>
                  <div className="approval-amount">
                    <span className="negative">₹{amount.toLocaleString()}</span>
                  </div>
                </div>

                <p className="approval-remarks">{txn.remarks}</p>

                <div className="approval-accounts">
                  <span className="acc-tag debit-tag">{debitEntry ? getAccountName(debitEntry.accountId) : '-'}</span>
                  <span className="approval-arrow">→</span>
                  <span className="acc-tag credit-tag">{creditEntry ? getAccountName(creditEntry.accountId) : '-'}</span>
                  {txn.partyId && <span className="approval-party">• {getPartyName(txn.partyId)}</span>}
                </div>

                {/* Rejection note input */}
                {rejectingId === txn.id && (
                  <div className="rejection-input-area">
                    <textarea
                      value={rejectionNote}
                      onChange={e => setRejectionNote(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={2}
                      autoFocus
                    />
                  </div>
                )}

                {/* Action buttons */}
                {isChecker && (
                  <div className="approval-actions">
                    {rejectingId === txn.id ? (
                      <>
                        <button className="action-btn" onClick={() => { setRejectingId(null); setRejectionNote(''); }}>
                          Cancel
                        </button>
                        <button
                          className="primary-btn reject-btn"
                          onClick={() => handleReject(txn.id)}
                          disabled={!rejectionNote.trim()}
                        >
                          Confirm Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="primary-btn approve-btn" onClick={() => handleApprove(txn.id)}>
                          ✓ Approve
                        </button>
                        <button className="action-btn reject-trigger-btn" onClick={() => setRejectingId(txn.id)}>
                          ✗ Reject
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
