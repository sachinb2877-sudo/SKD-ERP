import { useState, useEffect } from 'react'
import { useERP } from './hooks/useERP.js'
import { useToast } from './context/ToastContext.jsx'
import { ROLE_LABELS } from './constants/defaults.js'
import { generatePnLReport, generateBalanceSheetReport, generatePartyLedgerReport, generateCategoryReport } from './reports/generateAuditReport.js'
import Sidebar from './components/Sidebar.jsx'
import DashboardOverview from './components/DashboardOverview.jsx'
import Analytics from './components/Analytics.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import TransactionList from './components/TransactionList.jsx'
import Ledger from './components/Ledger.jsx'
import PartyManager from './components/PartyManager.jsx'
import ApprovalQueue from './components/ApprovalQueue.jsx'
import LoginPage from './components/LoginPage.jsx'
import UserManager from './components/UserManager.jsx'
import CashFlow from './components/CashFlow.jsx'
import Outstanding from './components/Outstanding.jsx'
import BankReconciliation from './components/BankReconciliation.jsx'
import AuditLog from './components/AuditLog.jsx'
import MilkSales from './components/MilkSales.jsx'


function App() {
  const {
    filteredTransactions,
    transactions,
    accounts,
    parties,
    categories,
    fiscalYear,
    setFiscalYear,
    availableYears,
    deleteTransaction,
    currentUser,
    isAuthenticated,
    logout,
    setToastFns,
    txnPagination,
    loadTransactionPage,
    isLoading,
  } = useERP();

  // Inject toast functions into ERPContext
  const toastFns = useToast();
  useEffect(() => {
    setToastFns(toastFns);
  }, [toastFns, setToastFns]);

  const [activeTab, setActiveTab] = useState('OVERVIEW');

  // Transaction page local filters
  const [filterMonth, setFilterMonth] = useState('ALL');

  // Report modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportType, setReportType] = useState('PNL');
  const [reportPartyId, setReportPartyId] = useState('');
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');

  // ── Filtered transactions for the transaction tab ───────────
  const tabFilteredTxns = filteredTransactions.filter(txn => {
    if (filterMonth === 'ALL') return true;
    const txnMonth = new Date(txn.date).toISOString().slice(0, 7);
    return txnMonth === filterMonth;
  });

  // Unique months from filtered transactions
  const months = [...new Set(filteredTransactions.map(t => new Date(t.date).toISOString().slice(0, 7)))].sort().reverse();

  // ── Report download ─────────────────────────────────────────
  const handleDownloadReport = () => {
    let period = '';
    if (reportFromDate && reportToDate) {
      period = `${new Date(reportFromDate).toLocaleDateString()} to ${new Date(reportToDate).toLocaleDateString()}`;
    } else if (reportFromDate) {
      period = `From ${new Date(reportFromDate).toLocaleDateString()}`;
    } else if (reportToDate) {
      period = `Up to ${new Date(reportToDate).toLocaleDateString()}`;
    } else {
      period = fiscalYear === 'ALL' ? 'All Time' : `FY ${fiscalYear}`;
    }

    let reportTxns = filteredTransactions;
    if (reportFromDate) {
      reportTxns = reportTxns.filter(t => t.date >= reportFromDate);
    }
    if (reportToDate) {
      reportTxns = reportTxns.filter(t => t.date <= reportToDate);
    }

    if (reportType === 'PNL') {
      generatePnLReport(reportTxns, accounts, period);
    } else if (reportType === 'BALANCE_SHEET') {
      let bsTxns = transactions;
      if (reportFromDate) bsTxns = bsTxns.filter(t => t.date >= reportFromDate);
      if (reportToDate) bsTxns = bsTxns.filter(t => t.date <= reportToDate);
      generateBalanceSheetReport(bsTxns, accounts, period);
    } else if (reportType === 'PARTY_LEDGER') {
      if (!reportPartyId) {
        toastFns.showWarning('Please select a party for the ledger report.');
        return;
      }
      const party = parties.find(p => p.id === reportPartyId);
      generatePartyLedgerReport(reportTxns, party, accounts, period);
    } else if (reportType === 'CATEGORY_WISE') {
      generateCategoryReport(reportTxns, period);
    }
    setIsModalOpen(false);
    toastFns.showSuccess('Report downloaded successfully');
  };

  // ── Tab title mapping ───────────────────────────────────────
  const tabTitles = {
    OVERVIEW: 'Dashboard Overview',
    ANALYTICS: 'Analytics Hub',
    TRANSACTIONS: 'Manage Transactions',
    APPROVALS: 'Approval Queue',
    LEDGER: 'General Ledger',
    PARTIES: 'Special Person Accounts',
    MILK_SALES: 'Milk Sales & Payout Registry',
    CASH_FLOW: 'Cash Flow Analysis',
    OUTSTANDING: 'Outstanding Tracking (AR/AP)',
    BANK_RECONCILE: 'Bank Reconciliation',
    AUDIT_LOG: 'System Audit Logs',
    USERS: 'User Management',
  };

  // ── Auth guard: show login page if not authenticated ─────
  if (!isAuthenticated) {
    return <LoginPage />;
  }



  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-viewport">
        <header className="topbar glass-panel">
          <h1>{tabTitles[activeTab]}</h1>
          <div className="topbar-actions">
            {/* User Info */}
            <div className="user-info-pill">
              <span className="user-avatar">{currentUser.name.charAt(0)}</span>
              <div className="user-details">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-role-label">{ROLE_LABELS[currentUser.role] || currentUser.role}</span>
              </div>
              <button className="logout-btn" onClick={logout} title="Sign Out">
                Sign Out
              </button>
            </div>

            {/* Global Fiscal Year Filter */}
            <div className="fiscal-year-filter">
              <label>Fiscal Year:</label>
              <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}>
                <option value="ALL">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            {currentUser?.permissions?.actions?.downloadReports && (
              <button className="primary-btn download-btn" onClick={() => setIsModalOpen(true)}>
                Download PDF Report
              </button>
            )}
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'OVERVIEW' && (
            <div className="fade-in">
              <DashboardOverview />
              <div className="recent-transactions">
                <h3 className="section-title">Recent Transactions</h3>
                <TransactionList
                  transactions={filteredTransactions.slice(0, 5)}
                  onDelete={deleteTransaction}
                />
              </div>
            </div>
          )}

          {activeTab === 'ANALYTICS' && (
            <div className="fade-in">
              <Analytics />
            </div>
          )}

          {activeTab === 'TRANSACTIONS' && (
            <div className="fade-in transaction-layout">
              {currentUser?.permissions?.actions?.createTransactions && (
                <aside className="transaction-form-sidebar">
                  <TransactionForm />
                </aside>
              )}
              <section className={`transaction-list-section ${!currentUser?.permissions?.actions?.createTransactions ? 'full-width' : ''}`}>
                <div className="filters glass-panel">
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                    <option value="ALL">All Months</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <TransactionList
                  transactions={tabFilteredTxns}
                  onDelete={deleteTransaction}
                  pagination={txnPagination}
                  onPageChange={loadTransactionPage}
                  isLoading={isLoading}
                />
              </section>
            </div>
          )}

          {activeTab === 'APPROVALS' && (
            <div className="fade-in">
              <ApprovalQueue />
            </div>
          )}

          {activeTab === 'LEDGER' && (
            <div className="fade-in">
              <Ledger />
            </div>
          )}

          {activeTab === 'PARTIES' && (
            <div className="fade-in">
              <PartyManager
                onViewLedger={(party) => {
                  setActiveTab('LEDGER');
                }}
              />
            </div>
          )}

          {activeTab === 'MILK_SALES' && (
            <div className="fade-in">
              <MilkSales />
            </div>
          )}

          {activeTab === 'CASH_FLOW' && (
            <div className="fade-in">
              <CashFlow />
            </div>
          )}

          {activeTab === 'OUTSTANDING' && (
            <div className="fade-in">
              <Outstanding />
            </div>
          )}

          {activeTab === 'BANK_RECONCILE' && (
            <div className="fade-in">
              <BankReconciliation />
            </div>
          )}

          {activeTab === 'AUDIT_LOG' && (
            <div className="fade-in">
              <AuditLog />
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="fade-in">
              <UserManager />
            </div>
          )}
        </div>
      </main>

      {/* ── Report Download Modal ─────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2>Download Report</h2>

            <div className="form-group">
              <label>Report Type</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="PNL">Profit & Loss Statement</option>
                <option value="BALANCE_SHEET">Balance Sheet</option>
                <option value="PARTY_LEDGER">Party Ledger Statement</option>
                <option value="CATEGORY_WISE">Category-wise Report</option>
              </select>
            </div>

            {reportType === 'PARTY_LEDGER' && (
              <div className="form-group">
                <label>Select Party</label>
                <select value={reportPartyId} onChange={e => setReportPartyId(e.target.value)}>
                  <option value="">— Select Party —</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Pickers */}
            <div className="date-range-row">
              <div className="form-group">
                <label>From Date</label>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={e => setReportFromDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>To Date</label>
                <input
                  type="date"
                  value={reportToDate}
                  onChange={e => setReportToDate(e.target.value)}
                  min={reportFromDate || undefined}
                />
              </div>
            </div>

            <div className="report-info glass-panel">
              <p className="text-secondary">
                {reportType === 'PNL' && 'Shows total revenue vs expenses for the selected date range.'}
                {reportType === 'BALANCE_SHEET' && 'Shows assets, liabilities, and equity as of the selected period.'}
                {reportType === 'PARTY_LEDGER' && 'Shows all transactions with the selected party and outstanding balance.'}
                {reportType === 'CATEGORY_WISE' && 'Shows transaction counts, total receipts, total payments, and net flows grouped by category.'}
              </p>
              <p className="text-secondary">
                Period: <strong>
                  {reportFromDate || reportToDate
                    ? `${reportFromDate ? new Date(reportFromDate).toLocaleDateString() : 'Start'} to ${reportToDate ? new Date(reportToDate).toLocaleDateString() : 'Today'}`
                    : fiscalYear === 'ALL' ? 'All Time' : `FY ${fiscalYear}`
                  }
                </strong>
              </p>
            </div>

            <div className="modal-actions">
              <button className="action-btn" onClick={() => { setIsModalOpen(false); setReportFromDate(''); setReportToDate(''); }}>Cancel</button>
              <button className="primary-btn" onClick={handleDownloadReport}>Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
