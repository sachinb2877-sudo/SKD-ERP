import dbConnect from '../_lib/db.js';
import Transaction from '../_models/Transaction.js';
import AuditTrail from '../_models/AuditTrail.js';
import { verifyAuth, requireRole } from '../_lib/auth.js';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await dbConnect();
    const user = verifyAuth(req);

    if (req.method === 'PATCH') {
      requireRole(user, 'ADMIN', 'CHECKER');
      
      const { action, rejectionNote } = req.body;
      const txn = await Transaction.findById(id);

      if (!txn) return res.status(404).json({ error: 'Transaction not found' });
      if (txn.status !== 'PENDING') return res.status(400).json({ error: 'Transaction is not pending' });

      // ── Self-approval block ──────────────────────────────────
      // A user cannot approve or reject their own transaction.
      // Check both userId (reliable) and name (fallback for older records).
      if (txn.createdById === user.id || txn.createdBy === user.name) {
        return res.status(403).json({ 
          error: 'You cannot approve or reject your own transaction. Another authorized user must review it.' 
        });
      }

      if (action === 'APPROVE') {
        txn.status = 'APPROVED';
        txn.approvedBy = user.name;
        txn.approvedById = user.id;
        txn.approvedAt = new Date();
        await txn.save();

        await AuditTrail.create({
          action: 'TRANSACTION_APPROVED',
          user: user.name,
          role: user.role,
          details: { txnId: txn._id },
        });

        return res.status(200).json(txn);
      } else if (action === 'REJECT') {
        if (!rejectionNote) return res.status(400).json({ error: 'Rejection note required' });

        txn.status = 'REJECTED';
        txn.rejectedBy = user.name;
        txn.rejectedById = user.id;
        txn.rejectionNote = rejectionNote;
        txn.rejectedAt = new Date();
        await txn.save();

        await AuditTrail.create({
          action: 'TRANSACTION_REJECTED',
          user: user.name,
          role: user.role,
          details: { txnId: txn._id, rejectionNote },
        });

        return res.status(200).json(txn);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    if (req.method === 'DELETE') {
      requireRole(user, 'ADMIN', 'CHECKER', 'MAKER');
      const { reason } = req.body;
      
      if (!reason) return res.status(400).json({ error: 'Deletion reason required' });

      const txn = await Transaction.findById(id);
      if (!txn) return res.status(404).json({ error: 'Transaction not found' });

      txn.isDeleted = true;
      txn.deletedBy = user.name;
      txn.deleteReason = reason;
      txn.deletedAt = new Date();
      await txn.save();

      await AuditTrail.create({
        action: 'TRANSACTION_DELETED',
        user: user.name,
        role: user.role,
        details: { txnId: txn._id, reason },
      });

      return res.status(200).json(txn);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
