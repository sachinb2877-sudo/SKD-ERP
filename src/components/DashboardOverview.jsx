import React from 'react';
import { useERP } from '../hooks/useERP.js';

const DashboardOverview = () => {
  const { summary } = useERP();

  const cards = [
    { label: 'Income', value: summary.totalIncome, className: 'positive', icon: '↓' },
    { label: 'Expenses', value: summary.totalExpense, className: 'negative', icon: '↑' },
    { label: 'Profit / Loss', value: summary.netProfit, className: summary.netProfit >= 0 ? 'positive' : 'negative', icon: '≡' },
    { label: 'Receivables (AR)', value: summary.totalAR, className: 'ar', icon: '📥' },
    { label: 'Payables (AP)', value: summary.totalAP, className: 'ap', icon: '📤' },
  ];

  return (
    <div className="cards">
      {cards.map(card => (
        <div key={card.label} className="card">
          <div className="card-header-row">
            <h3>{card.label}</h3>
            <span className="card-icon">{card.icon}</span>
          </div>
          <p className={`amount ${card.className}`}>
            ₹{Math.abs(card.value).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default DashboardOverview;
