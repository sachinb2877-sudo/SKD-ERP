import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatINR_PDF } from '../utils/formatters';
import { computePnL, computeBalanceSheet, computeAccountLedger } from '../utils/calculations';

// ═══════════════════════════════════════════════════════════════
// Shared PDF Helpers
// ═══════════════════════════════════════════════════════════════

const BRAND_BLUE = [59, 130, 246];
const BRAND_GREEN = [16, 185, 129];
const BRAND_RED = [239, 68, 68];
const BRAND_PURPLE = [139, 92, 246];
const BRAND_AMBER = [245, 158, 11];

function addHeader(doc, title, period) {
  const pageWidth = doc.internal.pageSize.width;

  // Brand bar
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SKD ERP', 40, 30);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 40, 48);

  // Period and date line
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text('Period: ' + period, 40, 78);
  doc.text('Generated: ' + new Date().toLocaleDateString() + ' at ' + new Date().toLocaleTimeString(), 40, 92);

  return 105; // Return startY for content
}

function addFooter(doc) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('SKD ERP - Page ' + i + ' of ' + pageCount, pageWidth / 2, pageHeight - 15, { align: 'center' });
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. Profit & Loss Statement
// ═══════════════════════════════════════════════════════════════

export function generatePnLReport(transactions, accounts, period) {
  const doc = new jsPDF('p', 'pt', 'a4');
  let startY = addHeader(doc, 'Profit & Loss Statement', period);

  const pnl = computePnL(transactions, accounts);

  // Summary cards
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('Summary', 40, startY);
  startY += 10;

  doc.autoTable({
    startY,
    head: [['Total Revenue', 'Total Expenses', 'Net Profit / (Loss)']],
    body: [[
      formatINR_PDF(pnl.totalRevenue),
      formatINR_PDF(pnl.totalExpenses),
      formatINR_PDF(pnl.netProfit),
    ]],
    theme: 'grid',
    headStyles: { fillColor: BRAND_BLUE, fontStyle: 'bold', halign: 'center' },
    styles: { halign: 'center', fontSize: 12, fontStyle: 'bold' },
  });

  startY = doc.lastAutoTable.finalY + 25;

  // Revenue breakdown
  const revenueRows = Object.entries(pnl.revenue).map(([accId, amt]) => {
    const acc = accounts.find(a => a.id === accId);
    return [acc?.name || accId, formatINR_PDF(amt)];
  });

  if (revenueRows.length > 0) {
    doc.autoTable({
      startY,
      head: [['Revenue Account', 'Amount']],
      body: revenueRows,
      foot: [['Total Revenue', formatINR_PDF(pnl.totalRevenue)]],
      theme: 'striped',
      headStyles: { fillColor: BRAND_GREEN },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });
    startY = doc.lastAutoTable.finalY + 20;
  }

  // Expense breakdown
  const expenseRows = Object.entries(pnl.expenses).map(([accId, amt]) => {
    const acc = accounts.find(a => a.id === accId);
    return [acc?.name || accId, formatINR_PDF(amt)];
  });

  if (expenseRows.length > 0) {
    doc.autoTable({
      startY,
      head: [['Expense Account', 'Amount']],
      body: expenseRows,
      foot: [['Total Expenses', formatINR_PDF(pnl.totalExpenses)]],
      theme: 'striped',
      headStyles: { fillColor: BRAND_RED },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });
  }

  addFooter(doc);
  doc.save('PnL_Statement_' + period.replace(/\s+/g, '_') + '.pdf');
}

// ═══════════════════════════════════════════════════════════════
// 2. Balance Sheet
// ═══════════════════════════════════════════════════════════════

export function generateBalanceSheetReport(transactions, accounts, period) {
  const doc = new jsPDF('p', 'pt', 'a4');
  let startY = addHeader(doc, 'Balance Sheet', period);

  const bs = computeBalanceSheet(transactions, accounts);

  // Assets
  const assetRows = Object.entries(bs.assets).map(([id, data]) => [data.name, data.group, formatINR_PDF(data.balance)]);

  doc.autoTable({
    startY,
    head: [['Asset Account', 'Group', 'Balance']],
    body: assetRows.length > 0 ? assetRows : [['No asset accounts', '', 'Rs. 0.00']],
    foot: [['', 'Total Assets', formatINR_PDF(bs.totalAssets)]],
    theme: 'striped',
    headStyles: { fillColor: BRAND_GREEN },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
  });

  startY = doc.lastAutoTable.finalY + 20;

  // Liabilities
  const liabilityRows = Object.entries(bs.liabilities).map(([id, data]) => [data.name, data.group, formatINR_PDF(data.balance)]);

  doc.autoTable({
    startY,
    head: [['Liability Account', 'Group', 'Balance']],
    body: liabilityRows.length > 0 ? liabilityRows : [['No liability accounts', '', 'Rs. 0.00']],
    foot: [['', 'Total Liabilities', formatINR_PDF(bs.totalLiabilities)]],
    theme: 'striped',
    headStyles: { fillColor: BRAND_RED },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
  });

  startY = doc.lastAutoTable.finalY + 20;

  // Equity
  doc.autoTable({
    startY,
    head: [['Equity', 'Amount']],
    body: [['Retained Earnings (Cumulative P&L)', formatINR_PDF(bs.equity.retainedEarnings)]],
    foot: [['Total Equity', formatINR_PDF(bs.totalEquity)]],
    theme: 'striped',
    headStyles: { fillColor: BRAND_PURPLE },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
  });

  startY = doc.lastAutoTable.finalY + 25;

  // Accounting equation check
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'Assets (' + formatINR_PDF(bs.totalAssets) + ') = Liabilities (' + formatINR_PDF(bs.totalLiabilities) + ') + Equity (' + formatINR_PDF(bs.totalEquity) + ')',
    40,
    startY
  );

  addFooter(doc);
  doc.save('Balance_Sheet_' + period.replace(/\s+/g, '_') + '.pdf');
}

// ═══════════════════════════════════════════════════════════════
// 3. Party Ledger Statement
// ═══════════════════════════════════════════════════════════════

export function generatePartyLedgerReport(transactions, party, accounts, period) {
  const doc = new jsPDF('p', 'pt', 'a4');
  let startY = addHeader(doc, 'Party Ledger - ' + party.name, period);

  // Party info
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text('Party: ' + party.name, 40, startY);
  doc.text('Type: ' + (party.type === 'CUSTOMER' ? 'Customer (Receivable)' : 'Vendor (Payable)'), 40, startY + 15);
  if (party.phone) doc.text('Phone: ' + party.phone, 40, startY + 30);
  if (party.email) doc.text('Email: ' + party.email, 40, startY + 45);

  startY += (party.phone || party.email) ? 65 : 35;

  // Get the linked account
  const linkedAccId = party.receivableAccountId || party.payableAccountId;
  const ledger = computeAccountLedger(transactions, linkedAccId);

  if (ledger.length === 0) {
    doc.setFontSize(12);
    doc.text('No transactions found for this party in the selected period.', 40, startY + 20);
  } else {
    const rows = ledger.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.remarks,
      e.category || 'General',
      e.debit > 0 ? formatINR_PDF(e.debit) : '-',
      e.credit > 0 ? formatINR_PDF(e.credit) : '-',
      formatINR_PDF(e.balance),
    ]);

    const totalDebit = ledger.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledger.reduce((s, e) => s + e.credit, 0);
    const outstanding = totalDebit - totalCredit;

    doc.autoTable({
      startY,
      head: [['Date', 'Remarks', 'Category', 'Debit', 'Credit', 'Balance']],
      body: rows,
      foot: [['', '', 'Totals', formatINR_PDF(totalDebit), formatINR_PDF(totalCredit), formatINR_PDF(outstanding)]],
      theme: 'striped',
      headStyles: { fillColor: BRAND_AMBER },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 70 },
        3: { halign: 'right', cellWidth: 75 },
        4: { halign: 'right', cellWidth: 75 },
        5: { halign: 'right', cellWidth: 75 },
      },
    });

    startY = doc.lastAutoTable.finalY + 20;

    // Outstanding summary
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    const label = party.type === 'CUSTOMER' ? 'Amount Receivable' : 'Amount Payable';
    doc.text(label + ': ' + formatINR_PDF(Math.abs(outstanding)), 40, startY);
  }

  addFooter(doc);
  doc.save('Party_Ledger_' + party.name.replace(/\s+/g, '_') + '_' + period.replace(/\s+/g, '_') + '.pdf');
}

// ═══════════════════════════════════════════════════════════════
// 4. Category-wise Report
// ═══════════════════════════════════════════════════════════════

export function generateCategoryReport(transactions, period) {
  const doc = new jsPDF('p', 'pt', 'a4');
  let startY = addHeader(doc, 'Category-wise Summary', period);

  // Group by category
  const categoriesMap = {};

  transactions.forEach(txn => {
    if (txn.isDeleted) return;
    const cat = txn.category || 'General';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = {
        name: cat,
        count: 0,
        receipts: 0,
        payments: 0,
      };
    }

    const debitEntry = txn.entries?.find(e => e.debit > 0);
    const creditEntry = txn.entries?.find(e => e.credit > 0);
    const amount = debitEntry?.debit || creditEntry?.credit || 0;

    categoriesMap[cat].count += 1;
    if (txn.type === 'RECEIPT') {
      categoriesMap[cat].receipts += amount;
    } else if (txn.type === 'PAYMENT') {
      categoriesMap[cat].payments += amount;
    }
  });

  const rows = Object.values(categoriesMap).map(c => {
    const netFlow = c.receipts - c.payments;
    return [
      c.name,
      c.count.toString(),
      c.receipts > 0 ? formatINR_PDF(c.receipts) : '-',
      c.payments > 0 ? formatINR_PDF(c.payments) : '-',
      formatINR_PDF(netFlow),
    ];
  });

  const totalCount = Object.values(categoriesMap).reduce((s, c) => s + c.count, 0);
  const totalReceipts = Object.values(categoriesMap).reduce((s, c) => s + c.receipts, 0);
  const totalPayments = Object.values(categoriesMap).reduce((s, c) => s + c.payments, 0);
  const totalNet = totalReceipts - totalPayments;

  doc.autoTable({
    startY,
    head: [['Category', 'Txn Count', 'Total Receipts', 'Total Payments', 'Net Flow']],
    body: rows,
    foot: [['Totals', totalCount.toString(), formatINR_PDF(totalReceipts), formatINR_PDF(totalPayments), formatINR_PDF(totalNet)]],
    theme: 'striped',
    headStyles: { fillColor: BRAND_BLUE },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 70 },
      2: { halign: 'right', cellWidth: 100 },
      3: { halign: 'right', cellWidth: 100 },
      4: { halign: 'right', cellWidth: 100 },
    },
  });

  addFooter(doc);
  doc.save('Category_Wise_Report_' + period.replace(/\s+/g, '_') + '.pdf');
}

// ═══════════════════════════════════════════════════════════════
// Legacy export (backward compatibility)
// ═══════════════════════════════════════════════════════════════

export const generateAuditReport = (summary, transactions, period) => {
  // Redirect to P&L for backward compat
  const fakeAccounts = [
    { id: 'acc_income', name: 'Income', type: 'REVENUE', group: 'INCOME' },
    { id: 'acc_expense', name: 'General Expense', type: 'EXPENSE', group: 'EXPENSE' },
  ];
  generatePnLReport(transactions, fakeAccounts, period);
};
