import React, { useState, useEffect } from 'react';
import { useERP } from '../hooks/useERP.js';
import { getNextVoucherNo } from '../context/ERPContext.jsx';

const TransactionForm = () => {
  const { accounts, parties, categories, addTransaction, addCategory, currentUser, transactions } = useERP();

  // Form state
  const [txnType, setTxnType] = useState('PAYMENT'); // RECEIPT, PAYMENT, JOURNAL, CONTRA
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [category, setCategory] = useState('');
  const [partyId, setPartyId] = useState('');
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [refNo, setRefNo] = useState('');

  // New category inline
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  // Resolve accounts dynamically based on txn type, payment mode, and category
  useEffect(() => {
    let dr = '';
    let cr = '';

    if (txnType === 'RECEIPT') {
      dr = paymentMode === 'CASH' ? 'acc_cash' : 'acc_bank';
      if (category === 'Product Sales' || category === 'Product Sales Revenue') {
        cr = 'acc_prod_sales';
      } else if (category === 'Other Income') {
        cr = 'acc_other_inc';
      } else if (category === 'Milk Sales' || category === 'Milk Sales Revenue') {
        cr = 'acc_milk_sales';
      } else {
        // Dynamic lookup: look for an expense/revenue account matching category name
        const matchedAcc = accounts.find(a => a.name.toLowerCase() === category.toLowerCase() && a.type === 'REVENUE');
        if (matchedAcc) {
          cr = matchedAcc.id;
        } else {
          cr = 'acc_milk_sales'; // default milk sales
        }
      }
    } else if (txnType === 'PAYMENT') {
      cr = paymentMode === 'CASH' ? 'acc_cash' : 'acc_bank';
      switch (category) {
        case 'Milk Purchase':
          dr = 'acc_milk_purchase';
          break;
        case 'Salary':
          dr = 'acc_salaries';
          break;
        case 'Fuel':
          dr = 'acc_fuel';
          break;
        case 'Transport':
          dr = 'acc_transport';
          break;
        case 'Electricity':
          dr = 'acc_electricity';
          break;
        case 'Maintenance':
          dr = 'acc_maintenance';
          break;
        case 'Office Expenses':
          dr = 'acc_office';
          break;
        case 'Feed Purchase':
          dr = 'acc_feed_purchase';
          break;
        case 'Equipment Purchase':
          dr = 'acc_equip_asset';
          break;
        default: {
          const matchedAcc = accounts.find(a => a.name.toLowerCase() === category.toLowerCase() && a.type === 'EXPENSE');
          if (matchedAcc) {
            dr = matchedAcc.id;
          } else {
            dr = 'acc_other_exp';
          }
        }
      }
    } else if (txnType === 'CONTRA') {
      if (paymentMode === 'CASH') {
        dr = 'acc_cash';
        cr = 'acc_bank';
      } else {
        dr = 'acc_bank';
        cr = 'acc_cash';
      }
    } else if (txnType === 'JOURNAL') {
      dr = 'acc_other_exp';
      cr = 'acc_other_inc';
    }

    setDebitAccountId(dr);
    setCreditAccountId(cr);
  }, [txnType, paymentMode, category, accounts]);

  // Smart defaults when txnType changes
  const handleTypeChange = (type) => {
    setTxnType(type);
    setPaymentMode('CASH');
    setCategory('');
    setPartyId('');
    setRefNo('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return alert('Please enter a valid amount.');
    }
    if (!remarks.trim()) {
      return alert('Remarks is mandatory. Please describe this transaction.');
    }
    if (!debitAccountId || !creditAccountId) {
      return alert('Please select both Debit and Credit accounts.');
    }
    if (debitAccountId === creditAccountId) {
      return alert('Debit and Credit accounts must be different.');
    }

    const parsedAmount = parseFloat(amount);

    const txn = {
      id: 'txn_' + Date.now().toString(),
      date,
      remarks: remarks.trim(),
      type: txnType,
      paymentMode: txnType === 'JOURNAL' ? 'JOURNAL' : paymentMode,
      refNo: txnType === 'JOURNAL' ? '' : refNo.trim(),
      entries: [
        { accountId: debitAccountId, debit: parsedAmount, credit: 0 },
        { accountId: creditAccountId, debit: 0, credit: parsedAmount },
      ],
      partyId: (txnType === 'RECEIPT' || txnType === 'PAYMENT') ? (partyId || null) : null,
      category: category || (txnType === 'RECEIPT' ? 'Milk Sales' : txnType === 'PAYMENT' ? 'Milk Purchase' : 'Miscellaneous'),
      createdAt: new Date().toISOString(),
    };

    addTransaction(txn);

    // Reset form
    setAmount('');
    setRemarks('');
    setPartyId('');
    setCategory('');
    setRefNo('');
    handleTypeChange(txnType); // Re-set smart defaults
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const type = txnType === 'RECEIPT' ? 'REVENUE' : 'EXPENSE';
      addCategory(newCategoryName.trim(), type);
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowNewCat(false);
    }
  };

  return (
    <form className="transaction-form glass-panel" onSubmit={handleSubmit}>
      <h3>Add Transaction</h3>

      {/* Transaction Type */}
      <div className="form-group">
        <label>Transaction Type</label>
        <div className="txn-type-toggle" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
          {['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA'].map(t => (
            <button
              key={t}
              type="button"
              className={`toggle-btn ${txnType === t ? 'active' : ''} ${t === 'RECEIPT' ? 'receipt' : t === 'PAYMENT' ? 'payment' : t === 'JOURNAL' ? 'journal' : 'contra'}`}
              onClick={() => handleTypeChange(t)}
              style={{ fontSize: '0.85rem', padding: '6px 2px' }}
            >
              {t === 'RECEIPT' ? '↓ Receipt' : t === 'PAYMENT' ? '↑ Payment' : t === 'JOURNAL' ? '⇄ Journal' : '⇅ Contra'}
            </button>
          ))}
        </div>
      </div>

      {/* Voucher Number Preview */}
      <div className="form-group">
        <label>Next Voucher Number</label>
        <input
          type="text"
          value={getNextVoucherNo(transactions, txnType, date)}
          disabled
          style={{ background: 'rgba(255, 255, 255, 0.08)', fontStyle: 'italic', fontWeight: 'bold', border: '1px dashed rgba(255, 255, 255, 0.2)' }}
        />
      </div>

      {/* Amount */}
      <div className="form-group">
        <label>Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          min="0.01"
          step="0.01"
          required
        />
      </div>

      {/* Remarks (mandatory) */}
      <div className="form-group">
        <label>Remarks <span className="required-star">*</span></label>
        <input
          type="text"
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="e.g. Daily office expense"
          required
        />
      </div>

      {/* Payment Mode (Only for Receipts, Payments, and Contra) */}
      {txnType !== 'JOURNAL' && (
        <div className="form-group">
          <label>Payment Mode</label>
          <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="BANK TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="NEFT/RTGS">NEFT/RTGS</option>
          </select>
        </div>
      )}

      {/* Category */}
      <div className="form-group">
        <label>Category</label>
        <select
          value={category}
          onChange={e => {
            if (e.target.value === 'ADD_NEW') {
              setShowNewCat(true);
            } else {
              setCategory(e.target.value);
              setShowNewCat(false);
            }
          }}
        >
          <option value="">Select Category</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="ADD_NEW">+ Add Custom Category</option>
        </select>
        {showNewCat && (
          <div className="new-category-input">
            <input
              type="text"
              placeholder="New Category Name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
            />
            <button type="button" onClick={handleAddCategory}>Add</button>
          </div>
        )}
      </div>

      {currentUser.role === 'MAKER' && (
        <div className="maker-notice">
          <span>📋</span> Transactions will be submitted for approval
        </div>
      )}

      <button type="submit" className="primary-btn">
        {currentUser.role === 'MAKER' ? 'Submit for Approval' : 'Add Transaction'}
      </button>
    </form>
  );
};

export default TransactionForm;
