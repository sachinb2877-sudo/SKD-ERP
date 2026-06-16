import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE'],
      required: true,
    },
    group: {
      type: String,
      enum: ['CASH', 'BANK', 'INCOME', 'EXPENSE', 'RECEIVABLE', 'PAYABLE'],
      required: true,
    },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Account || mongoose.model('Account', accountSchema);
