import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to determine Fiscal Year starting year
const getFY = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().getFullYear().toString();
  const year = d.getFullYear();
  const month = d.getMonth();
  const fyStart = month >= 3 ? year : year - 1;
  return fyStart.toString();
};

// 1. Get all transactions (filterable by status)
router.get('/', authenticateJWT, async (req, res) => {
  const db = req.app.get('db');
  const { status, type } = req.query;

  try {
    let query = `
      SELECT t.*, u.name as creator_name,
             (SELECT json_agg(le.*) FROM ledger_entries le WHERE le.transaction_id = t.id) as entries
      FROM transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.is_deleted = false
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      query += ` AND t.type = $${params.length}`;
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching transactions' });
  }
});

// 2. Create Transaction (Maker submits draft, Admin/Checker auto-approves)
router.post('/', authenticateJWT, async (req, res) => {
  const db = req.app.get('db');
  const { date, type, remarks, paymentMode, refNo, entries, partyId, category } = req.body;

  if (!date || !type || !remarks || !entries || entries.length !== 2) {
    return res.status(400).json({ error: 'Incomplete transaction parameters. Must have date, type, remarks, and 2 double-entry items.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN'); // Start transaction block

    const status = req.user.role === 'MAKER' ? 'PENDING' : 'APPROVED';
    const fy = getFY(date);
    const prefixMap = { RECEIPT: 'RV', PAYMENT: 'PV', JOURNAL: 'JV', CONTRA: 'CV' };
    const prefix = prefixMap[type] || 'TX';
    const searchPrefix = `${prefix}-${fy}-`;

    // Row locking to prevent concurrent voucher duplicates
    const maxRes = await client.query(
      'SELECT voucher_no FROM transactions WHERE voucher_no LIKE $1 FOR UPDATE',
      [`${searchPrefix}%`]
    );

    let maxSeq = 0;
    maxRes.rows.forEach(r => {
      const seqStr = r.voucher_no.substring(searchPrefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });

    const nextSeq = maxSeq + 1;
    const voucherNo = `${searchPrefix}${nextSeq.toString().padStart(4, '0')}`;

    // Insert Header
    const txnRes = await client.query(
      `INSERT INTO transactions 
       (voucher_no, date, type, remarks, status, payment_mode, ref_no, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [voucherNo, date, type, remarks, status, paymentMode || 'CASH', refNo || '', req.user.id]
    );
    const txnId = txnRes.rows[0].id;

    // Insert entries
    for (let entry of entries) {
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, party_id, debit, credit)
         VALUES ($1, $2, $3, $4, $5)`,
        [txnId, entry.accountId, partyId || null, entry.debit || 0, entry.credit || 0]
      );
    }

    // Insert Audit Entry
    await client.query(
      `INSERT INTO audit_trail (username, role, action, ip_address, txn_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.name,
        req.user.role,
        'TRANSACTION_CREATED',
        req.ip || '127.0.0.1',
        txnId,
        JSON.stringify({ voucherNo, type, remarks, status })
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ id: txnId, voucherNo, status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Database transaction failed: could not save record' });
  } finally {
    client.release();
  }
});

// 3. Approve Transaction (Checker/Admin action)
router.post('/:id/approve', authenticateJWT, requireRole(['ADMIN', 'CHECKER']), async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    const txn = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await db.query(
      `UPDATE transactions 
       SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.id, id]
    );

    await db.query(
      `INSERT INTO audit_trail (username, role, action, ip_address, txn_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.name, req.user.role, 'TRANSACTION_APPROVED', req.ip || '127.0.0.1', id, 'PENDING', 'APPROVED']
    );

    res.json({ success: true, message: 'Transaction approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error approving transaction' });
  }
});

// 4. Reject Transaction (Checker/Admin action)
router.post('/:id/reject', authenticateJWT, requireRole(['ADMIN', 'CHECKER']), async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const txn = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (txn.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await db.query(
      `UPDATE transactions 
       SET status = 'REJECTED', approved_by = $1, approved_at = CURRENT_TIMESTAMP, delete_reason = $2
       WHERE id = $3`,
      [req.user.id, reason, id]
    );

    await db.query(
      `INSERT INTO audit_trail (username, role, action, ip_address, txn_id, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.name, req.user.role, 'TRANSACTION_REJECTED', req.ip || '127.0.0.1', id, 'PENDING', `REJECTED: ${reason}`]
    );

    res.json({ success: true, message: 'Transaction rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error rejecting transaction' });
  }
});

// 5. Delete Transaction (Requires reason)
router.delete('/:id', authenticateJWT, requireRole(['ADMIN', 'CHECKER']), async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Delete reason is mandatory' });
  }

  try {
    const txnRes = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
    if (txnRes.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await db.query(
      `UPDATE transactions 
       SET is_deleted = true, delete_reason = $1 
       WHERE id = $2`,
      [reason, id]
    );

    await db.query(
      `INSERT INTO audit_trail (username, role, action, ip_address, txn_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.name, req.user.role, 'TRANSACTION_DELETED', req.ip || '127.0.0.1', id, `Deleted. Reason: ${reason}`]
    );

    res.json({ success: true, message: 'Transaction soft-deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error deleting transaction' });
  }
});

// 6. Bank Reconciliation Status Update
router.post('/:id/reconcile', authenticateJWT, async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { clearanceDate, status } = req.body; // status = 'RECONCILED' or 'UNRECONCILED'

  try {
    await db.query(
      `UPDATE transactions 
       SET reconciled_status = $1, clearance_date = $2
       WHERE id = $3`,
      [status || 'RECONCILED', clearanceDate || null, id]
    );

    await db.query(
      `INSERT INTO audit_trail (username, role, action, ip_address, txn_id, new_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.name, req.user.role, 'BANK_RECONCILED', req.ip || '127.0.0.1', id, `Reconcile clearance set to: ${status} on ${clearanceDate}`]
    );

    res.json({ success: true, message: 'Bank reconciliation details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error updating bank reconciliation details' });
  }
});

export default router;
