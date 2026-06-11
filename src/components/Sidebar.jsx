import React from 'react';
import { useERP } from '../hooks/useERP.js';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { summary, currentUser } = useERP();

  const tabs = [
    { id: 'OVERVIEW',       label: 'Overview',       icon: '📊' },
    { id: 'ANALYTICS',      label: 'Analytics',      icon: '📈' },
    { id: 'TRANSACTIONS',   label: 'Transactions',   icon: '💳' },
    { id: 'APPROVALS',      label: 'Approvals',      icon: '✅', badge: summary.pendingCount },
    { id: 'LEDGER',         label: 'Ledger',         icon: '📒' },
    { id: 'PARTIES',        label: 'Parties',        icon: '👥' },
    { id: 'MILK_SALES',      label: 'Milk Sales',      icon: '🥛' },
    { id: 'CASH_FLOW',      label: 'Cash Flow',      icon: '💸' },
    { id: 'OUTSTANDING',    label: 'Outstanding',    icon: '⏳' },
    { id: 'BANK_RECONCILE', label: 'Bank Reconcile', icon: '🏦' },
    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'CHECKER' ? [{ id: 'AUDIT_LOG', label: 'Audit Log', icon: '📜' }] : []),
    ...(currentUser?.role === 'ADMIN' ? [{ id: 'USERS', label: 'Users', icon: '🔐' }] : []),
  ];

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
          >
            <span className="icon">{tab.icon}</span>
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
