import React, { useState } from 'react';

/**
 * DeleteConfirmModal — Strict deletion confirmation with mandatory reason.
 * Implements soft-delete: transaction is marked isDeleted=true, never hard-deleted.
 * Deletion + reason are logged to the audit trail via the context.
 */
const DeleteConfirmModal = ({ transaction, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 3; // Min 3 chars

  const amount = transaction?.entries?.[0]?.debit || transaction?.entries?.[0]?.credit || 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel delete-modal">
        {/* Warning Header */}
        <div className="delete-modal-header">
          <span className="delete-warning-icon">⚠️</span>
          <h2>Confirm Deletion</h2>
        </div>

        <div className="delete-modal-body">
          <div className="delete-warning-box">
            <p><strong>You are about to delete this transaction:</strong></p>
            <div className="delete-txn-summary">
              <div className="delete-txn-row">
                <span className="text-secondary">Date:</span>
                <span>{new Date(transaction.date).toLocaleDateString()}</span>
              </div>
              <div className="delete-txn-row">
                <span className="text-secondary">Remarks:</span>
                <span>{transaction.remarks}</span>
              </div>
              <div className="delete-txn-row">
                <span className="text-secondary">Amount:</span>
                <span className="negative">₹{amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <p className="delete-notice text-secondary">
            This action will soft-delete the transaction. It will be removed from all ledgers and reports but retained in the audit trail for compliance.
          </p>

          {/* Mandatory Reason Input */}
          <div className="form-group">
            <label>
              Reason for Deletion <span className="required-star">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter a detailed reason (min. 3 characters)..."
              rows={3}
              className="delete-reason-input"
              autoFocus
            />
            {reason.length > 0 && reason.trim().length < 3 && (
              <p className="delete-error">Reason must be at least 3 characters.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="action-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`primary-btn delete-confirm-btn ${!isValid ? 'disabled' : ''}`}
            onClick={() => isValid && onConfirm(transaction.id, reason.trim())}
            disabled={!isValid}
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
