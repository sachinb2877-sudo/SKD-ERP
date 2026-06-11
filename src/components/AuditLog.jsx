import React, { useState, useMemo } from 'react';
import { useERP } from '../hooks/useERP.js';

const AuditLog = () => {
  const { auditTrail } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  // Get unique actions for filter options
  const uniqueActions = useMemo(() => {
    const actions = new Set(auditTrail.map(log => log.action));
    return ['ALL', ...actions];
  }, [auditTrail]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditTrail.filter(log => {
      // Action Filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;

      // Text Search
      if (!searchTerm.trim()) return true;
      const s = searchTerm.toLowerCase();
      const user = log.user || '';
      const action = log.action || '';
      const details = log.newValue || '';
      const oldVal = log.oldValue || '';
      
      return user.toLowerCase().includes(s) ||
             action.toLowerCase().includes(s) ||
             details.toLowerCase().includes(s) ||
             oldVal.toLowerCase().includes(s);
    });
  }, [auditTrail, searchTerm, actionFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return alert('No logs available to export.');

    const headers = ['Timestamp', 'User', 'Role', 'IP Address', 'Action', 'Old Value', 'New Value'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user,
      log.role,
      log.ipAddress || '127.0.0.1',
      log.action,
      log.oldValue ? log.oldValue.replace(/"/g, '""') : '',
      log.newValue ? log.newValue.replace(/"/g, '""') : ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `erp_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="audit-log-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search & Export Panel */}
      <div className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 Search logs by user, action, details..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              minWidth: '260px',
              outline: 'none'
            }}
          />

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
          >
            {uniqueActions.map(action => (
              <option key={action} value={action}>
                {action === 'ALL' ? 'Filter by Action (All)' : action}
              </option>
            ))}
          </select>
        </div>

        <button onClick={handleExportCSV} className="primary-btn" style={{ fontSize: '0.85rem' }}>
          📤 Export CSV Report
        </button>
      </div>

      {/* Main Logs Table Grid */}
      <div className="transaction-list glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem' }}>Immutable System Audit Log</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Timestamp</th>
                <th>User (Role)</th>
                <th>Action</th>
                <th>IP Address</th>
                <th>Action Description Summary</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const isExpanded = expandedId === log.id;
                const dateStr = new Date(log.timestamp).toLocaleString();
                
                // Truncate values for cleaner summary view
                let valSummary = '';
                if (log.newValue) {
                  try {
                    const parsed = JSON.parse(log.newValue);
                    valSummary = parsed.remarks || parsed.action || log.newValue.substring(0, 60);
                  } catch {
                    valSummary = log.newValue.substring(0, 60);
                  }
                }

                return (
                  <React.Fragment key={log.id}>
                    <tr onClick={() => handleToggleRow(log.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ textAlign: 'center', color: '#60a5fa' }}>{isExpanded ? '▼' : '▶'}</td>
                      <td>{dateStr}</td>
                      <td>
                        <strong>{log.user}</strong> <br />
                        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{log.role}</span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: log.action.includes('CREATED') ? 'rgba(16,185,129,0.15)' : log.action.includes('DELETED') || log.action.includes('REJECTED') ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: log.action.includes('CREATED') ? '#10b981' : log.action.includes('DELETED') || log.action.includes('REJECTED') ? '#f87171' : '#f59e0b',
                          fontWeight: '600'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td><code style={{ fontSize: '0.8rem' }}>{log.ipAddress || '127.0.0.1'}</code></td>
                      <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                        {valSummary}
                      </td>
                    </tr>
                    
                    {/* Expand details view block */}
                    {isExpanded && (
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td></td>
                        <td colSpan="5" style={{ padding: '15px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="responsive-grid">
                            
                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '5px' }}>Original State / Old Value</div>
                              <pre style={{
                                padding: '10px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: '#f87171',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                margin: 0
                              }}>
                                {log.oldValue ? (
                                  log.oldValue.startsWith('{') ? JSON.stringify(JSON.parse(log.oldValue), null, 2) : log.oldValue
                                ) : 'No pre-existing values (Newly Created)'}
                              </pre>
                            </div>

                            <div>
                              <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '5px' }}>Modified State / New Value</div>
                              <pre style={{
                                padding: '10px',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                color: '#34d399',
                                overflowX: 'auto',
                                whiteSpace: 'pre-wrap',
                                margin: 0
                              }}>
                                {log.newValue ? (
                                  log.newValue.startsWith('{') ? JSON.stringify(JSON.parse(log.newValue), null, 2) : log.newValue
                                ) : 'No value changes recorded.'}
                              </pre>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center" style={{ padding: '20px' }}>
                    No audit logs matching selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AuditLog;
