import mongoose from 'mongoose';

const auditTrailSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    user: { type: String, required: true },
    role: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    // Removed capped collection — financial audit data must not be silently dropped.
    // For compliance, all audit entries are retained indefinitely.
  }
);

// Index for efficient time-sorted queries
auditTrailSchema.index({ timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });

export default mongoose.models.AuditTrail || mongoose.model('AuditTrail', auditTrailSchema);
