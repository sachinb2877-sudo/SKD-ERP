import dbConnect from './db.js';
import User from '../_models/User.js';
import Account from '../_models/Account.js';
import Category from '../_models/Category.js';
import { getDefaultPermissions } from './permissions.js';

const SYSTEM_ACCOUNTS = [
  { accountId: 'acc_cash', name: 'Cash', type: 'ASSET', group: 'CASH', isSystem: true },
  { accountId: 'acc_bank', name: 'Bank Account', type: 'ASSET', group: 'BANK', isSystem: true },
  { accountId: 'acc_income', name: 'Income', type: 'REVENUE', group: 'INCOME', isSystem: true },
  { accountId: 'acc_expense', name: 'General Expense', type: 'EXPENSE', group: 'EXPENSE', isSystem: true },
];

const DEFAULT_CATEGORIES = ['Expense', 'Investment', 'Education', 'Salary', 'Freelance', 'Other'];

const DEFAULT_USERS = [
  { userId: 'admin', password: 'admin123', name: 'Admin', role: 'ADMIN', permissions: getDefaultPermissions('ADMIN') },
  { userId: 'checker', password: 'checker123', name: 'Checker', role: 'CHECKER', permissions: getDefaultPermissions('CHECKER') },
  { userId: 'accountant', password: 'acc123', name: 'Accountant', role: 'MAKER', permissions: getDefaultPermissions('MAKER') },
  { userId: 'viewer', password: 'viewer123', name: 'Viewer', role: 'VIEWER', permissions: getDefaultPermissions('VIEWER') },
];

export async function runSeed() {
  await dbConnect();

  const results = { accounts: 0, categories: 0, users: 0 };

  // Seed Accounts
  for (const acc of SYSTEM_ACCOUNTS) {
    const existing = await Account.findOne({ accountId: acc.accountId });
    if (!existing) {
      await Account.create(acc);
      results.accounts++;
    }
  }

  // Seed Categories
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await Category.findOne({ name: cat });
    if (!existing) {
      await Category.create({ name: cat });
      results.categories++;
    }
  }

  // Seed Users
  for (const user of DEFAULT_USERS) {
    const existing = await User.findOne({ userId: user.userId });
    if (!existing) {
      await User.create(user);
      results.users++;
    }
  }

  return results;
}
