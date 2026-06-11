import React, { useState } from 'react';
import { useERP } from '../hooks/useERP.js';
import { ROLE_OPTIONS, ROLE_COLORS } from '../constants/defaults.js';

const UserManager = () => {
  const { users, addUser, editUser, deleteUser, currentUser, resetDatabase } = useERP();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ id: '', password: '', name: '', role: 'VIEWER' });
  const [showPasswords, setShowPasswords] = useState({});

  const isAdmin = currentUser?.role === 'ADMIN';

  const resetForm = () => {
    setFormData({ id: '', password: '', name: '', role: 'VIEWER' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return alert('Name is required.');

    if (editId) {
      // Edit: update only changed fields
      const updates = { name: formData.name.trim(), role: formData.role };
      if (formData.password.trim()) {
        updates.password = formData.password.trim();
      }
      editUser(editId, updates);
    } else {
      // Add: all fields required
      if (!formData.id.trim()) return alert('User ID is required.');
      if (!formData.password.trim()) return alert('Password is required.');
      if (users.find(u => u.id === formData.id.trim().toLowerCase())) {
        return alert('A user with this ID already exists.');
      }
      addUser({
        id: formData.id.trim().toLowerCase(),
        password: formData.password.trim(),
        name: formData.name.trim(),
        role: formData.role,
      });
    }
    resetForm();
  };

  const handleEdit = (user) => {
    setEditId(user.id);
    setFormData({
      id: user.id,
      password: '',
      name: user.name,
      role: user.role,
    });
    setShowForm(true);
  };

  const handleDelete = (user) => {
    if (user.id === 'admin') return alert('The Admin account cannot be deleted.');
    if (user.id === currentUser?.id) return alert('You cannot delete your own account.');
    if (confirm(`Delete user "${user.name}" (${user.id})? This action cannot be undone.`)) {
      deleteUser(user.id);
    }
  };

  const togglePassword = (userId) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleResetDatabase = () => {
    const confirmFirst = confirm("Are you sure you want to delete all transaction history, party registries, and custom ledger accounts?\n\nThis will reset the database back to factory settings. This action cannot be undone.");
    if (!confirmFirst) return;

    const typedConfirm = prompt("To confirm the deletion of all data, please type 'RESET' in the box below:");
    if (typedConfirm === 'RESET') {
      resetDatabase();
      alert("Database has been successfully reset. All transaction records and parties cleared.");
    } else if (typedConfirm !== null) {
      alert("Confirmation mismatch. Reset aborted.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-panel text-center" style={{ padding: '3rem 2rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔒</p>
        <p>Only Admin users can manage accounts.</p>
        <p className="text-secondary">Current role: {currentUser?.role}</p>
      </div>
    );
  }

  return (
    <div className="user-manager">
      <div className="user-manager-header">
        <h3 className="section-title">User Accounts</h3>
        <button className="primary-btn add-party-btn" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form className="user-form glass-panel" onSubmit={handleSubmit}>
          <h4>{editId ? `Edit User: ${editId}` : 'Create New User'}</h4>
          <div className="user-form-grid">
            {!editId && (
              <div className="form-group">
                <label>User ID <span className="required-star">*</span></label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={e => setFormData(p => ({ ...p, id: e.target.value }))}
                  placeholder="e.g. john"
                  required
                  autoFocus
                />
              </div>
            )}
            <div className="form-group">
              <label>Full Name <span className="required-star">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="form-group">
              <label>{editId ? 'New Password (leave blank to keep)' : 'Password'} {!editId && <span className="required-star">*</span>}</label>
              <input
                type="text"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder={editId ? 'Leave blank to keep current' : 'Enter password'}
                required={!editId}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                disabled={editId === 'admin'}
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {editId === 'admin' && (
                <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Admin role cannot be changed.
                </p>
              )}
            </div>
          </div>
          <button type="submit" className="primary-btn">{editId ? 'Update User' : 'Create User'}</button>
        </form>
      )}

      {/* Users Table */}
      <div className="glass-panel user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Password</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={user.id === currentUser?.id ? 'current-user-row' : ''}>
                <td>
                  <code className="user-id-code">{user.id}</code>
                </td>
                <td>{user.name}</td>
                <td>
                  <div className="password-cell">
                    <span className="password-text">
                      {showPasswords[user.id] ? user.password : '••••••••'}
                    </span>
                    <button
                      type="button"
                      className="password-peek-btn"
                      onClick={() => togglePassword(user.id)}
                      title={showPasswords[user.id] ? 'Hide' : 'Show'}
                    >
                      {showPasswords[user.id] ? '🙈' : '👁️'}
                    </button>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${ROLE_COLORS[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <div className="user-actions">
                    <button className="action-btn" onClick={() => handleEdit(user)}>Edit</button>
                    {user.id !== 'admin' && user.id !== currentUser?.id && (
                      <button className="action-btn delete" onClick={() => handleDelete(user)}>Delete</button>
                    )}
                    {user.id === currentUser?.id && (
                      <span className="you-badge">You</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Danger Zone: Database Reset */}
      <div className="glass-panel" style={{ marginTop: '2rem', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '1.5rem 2rem' }}>
        <h4 style={{ color: '#f87171', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span> Danger Zone: System Maintenance
        </h4>
        <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0 0 1.25rem 0', lineHeight: '1.5', color: '#cbd5e1' }}>
          Resetting the database will permanently delete all transaction history, journal entries, milk sales registries, outstanding balances (AR/AP), customer & vendor party accounts, and previous system audit logs.
          <strong> User accounts and your current login session will be preserved.</strong> This operation is destructive and cannot be undone.
        </p>
        <button 
          onClick={handleResetDatabase} 
          className="action-btn delete" 
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            borderColor: 'rgba(239, 68, 68, 0.3)', 
            color: '#f87171', 
            fontWeight: '600', 
            padding: '0.6rem 1.25rem',
            cursor: 'pointer',
            borderRadius: '6px'
          }}
        >
          🗑️ Reset Database to Factory Defaults
        </button>
      </div>
    </div>
  );
};

export default UserManager;
