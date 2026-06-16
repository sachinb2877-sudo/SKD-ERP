import React from 'react';
import { useERP } from '../hooks/useERP.js';

// SVG icon components for accessibility (replacing emoji)
const icons = {
  OVERVIEW: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="10" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  ANALYTICS: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 14l4-5 3 3 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  TRANSACTIONS: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 7h14" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 11h3M5 13h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  APPROVALS: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  LEDGER: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 2h10a2 2 0 012 2v10a2 2 0 01-2 2H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 2v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 6h5M7 9h5M7 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  PARTIES: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 15c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="13" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M14 10c2 .5 3 2 3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  USERS: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="4" y="8" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 8V6a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  MILK_SALES: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M6 5V2.5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0112 2.5V5M5 6.5h8l-1 9a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 014 15.5l-1-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10.5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  CASH_FLOW: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 13.5l3.5-3.5 2.5 2.5 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 6.5h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="2" y="2" width="5" height="3" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  OUTSTANDING: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 4.5v5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  BANK_RECONCILE: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 15h14M3 8v5M7 8v5M11 8v5M15 8v5M9 2L2 6.5V8h14V6.5L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  AUDIT_LOG: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="2" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
};

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { summary, currentUser } = useERP();

  const tabs = [
    { id: 'OVERVIEW',       label: 'Overview',       show: currentUser?.permissions?.pages?.overview },
    { id: 'ANALYTICS',      label: 'Analytics',      show: currentUser?.permissions?.pages?.analytics },
    { id: 'TRANSACTIONS',   label: 'Transactions',   show: currentUser?.permissions?.pages?.transactions },
    { id: 'APPROVALS',      label: 'Approvals',      badge: summary.pendingCount, show: currentUser?.permissions?.pages?.approvals },
    { id: 'LEDGER',         label: 'Ledger',         show: currentUser?.permissions?.pages?.ledger },
    { id: 'PARTIES',        label: 'Parties',        show: currentUser?.permissions?.pages?.parties },
    { id: 'MILK_SALES',     label: 'Milk Sales',     show: true },
    { id: 'CASH_FLOW',      label: 'Cash Flow',      show: true },
    { id: 'OUTSTANDING',    label: 'Outstanding',    show: true },
    { id: 'BANK_RECONCILE', label: 'Bank Reconcile', show: true },
    { id: 'AUDIT_LOG',      label: 'Audit Log',      show: currentUser?.role === 'ADMIN' || currentUser?.role === 'CHECKER' },
    { id: 'USERS',          label: 'Users',          show: currentUser?.role === 'ADMIN' || currentUser?.permissions?.pages?.users },
  ].filter(tab => tab.show !== false);

  return (
    <aside className="sidebar-nav glass-panel">
      <div className="brand">
        <h2>SKD</h2>
        <p>ERP System</p>
      </div>
      <nav>
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
          >
            <span className="icon" aria-hidden="true">{icons[tab.id]}</span>
            {tab.label}
            {tab.badge > 0 && (
              <span className="nav-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
