import React, { useState } from 'react';
import { useERP } from '../hooks/useERP.js';
import { useToast } from '../context/ToastContext.jsx';
import { ROLE_OPTIONS, ROLE_COLORS, PERMISSION_LABELS } from '../constants/defaults.js';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';

const UserManager = () => {
  const { users, addUser, editUser, deleteUser, updateUserPermissions, currentUser, isLoading } = useERP();
  const { showWarning, showInfo } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ id: '', password: '', name: '', role: 'VIEWER' });
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [permissionsData, setPermissionsData] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const resetForm = () => {
    setFormData({ id: '', password: '', name: '', role: 'VIEWER' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showWarning('Name is required.');
      return;
    }

    if (editId) {
      const updates = { name: formData.name.trim(), role: formData.role };
      if (formData.password.trim()) {
        updates.password = formData.password.trim();
      }
      editUser(editId, updates);
    } else {
      if (!formData.id.trim()) {
        showWarning('User ID is required.');
        return;
      }
      if (!formData.password.trim()) {
        showWarning('Password is required.');
        return;
      }
      if (users.find(u => u.id === formData.id.trim().toLowerCase())) {
        showWarning('A user with this ID already exists.');
        return;
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
    if (user.id === 'admin') {
      showWarning('The Admin account cannot be deleted.');
      return;
    }
    if (user.id === currentUser?.id) {
      showWarning('You cannot delete your own account.');
      return;
    }
    setDeletingUser(user);
  };

  const confirmDelete = () => {
    if (deletingUser) {
      deleteUser(deletingUser.id);
      setDeletingUser(null);
    }
  };

  const handlePermissionsClick = (user) => {
    setPermissionsUser(user);
    setPermissionsData(JSON.parse(JSON.stringify(user.permissions || { pages: {}, actions: {} })));
  };

  const handlePermissionsSave = async (e) => {
    e.preventDefault();
    await updateUserPermissions(permissionsUser.id, permissionsData);
    setPermissionsUser(null);
    setPermissionsData(null);
  };

  if (!isAdmin) {
    return (
      <div className="glass-panel text-center" style={{ padding: '3rem 2rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="20" width="32" height="22" rx="4" stroke="currentColor" strokeWidth="2.5"/>
            <path d="M16 20V14a8 8 0 0116 0v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="24" cy="32" r="3" fill="currentColor"/>
          </svg>
        </p>
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
                type="password"
                value={formData.password}
                onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder={editId ? 'Leave blank to keep current' : 'Enter password'}
                required={!editId}
                autoComplete="new-password"
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
          <button type="submit" className="primary-btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : (editId ? 'Update User' : 'Create User')}
          </button>
        </form>
      )}

      {/* Permissions Modal */}
      {permissionsUser && permissionsData && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '100%' }}>
            <h2>Permissions: {permissionsUser.name}</h2>
            <form onSubmit={handlePermissionsSave}>
              <div className="permissions-grid">
                <div className="permissions-section">
                  <h4>Pages View Access</h4>
                  {Object.entries(PERMISSION_LABELS.pages).map(([key, label]) => (
                    <label key={key} className="permission-toggle">
                      <input 
                        type="checkbox" 
                        checked={!!permissionsData.pages[key]}
                        onChange={e => setPermissionsData({
                          ...permissionsData,
                          pages: { ...permissionsData.pages, [key]: e.target.checked }
                        })}
                      />
                      <span className="toggle-slider"></span>
                      {label}
                    </label>
                  ))}
                </div>
                <div className="permissions-section">
                  <h4>Action Abilities</h4>
                  {Object.entries(PERMISSION_LABELS.actions).map(([key, label]) => (
                    <label key={key} className="permission-toggle">
                      <input 
                        type="checkbox" 
                        checked={!!permissionsData.actions[key]}
                        onChange={e => setPermissionsData({
                          ...permissionsData,
                          actions: { ...permissionsData.actions, [key]: e.target.checked }
                        })}
                      />
                      <span className="toggle-slider"></span>
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="action-btn" onClick={() => setPermissionsUser(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
            <h2>Delete User</h2>
            <p>
              Are you sure you want to delete user <strong>"{deletingUser.name}"</strong> ({deletingUser.id})?
            </p>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>This action cannot be undone.</p>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="action-btn" onClick={() => setDeletingUser(null)}>Cancel</button>
              <button className="primary-btn delete" onClick={confirmDelete} disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
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
                  <span className={`role-badge ${ROLE_COLORS[user.role]}`}>
                    {user.role}
                  </span>
                </td>
                <td className="text-secondary" style={{ fontSize: '0.85rem' }}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                </td>
                <td>
                  <div className="user-actions">
                    <button className="action-btn" onClick={() => handleEdit(user)}>Edit</button>
                    {user.id !== 'admin' && (
                      <button className="action-btn" onClick={() => handlePermissionsClick(user)}>Permissions</button>
                    )}
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
    </div>
  );
};

export default UserManager;
