import React, { useState } from 'react';
import { useERP } from '../hooks/useERP.js';

const LoginPage = () => {
  const { login, users } = useERP();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId.trim() || !password.trim()) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setIsLoading(true);

    // Simulate auth delay for UX
    await new Promise(r => setTimeout(r, 600));

    const result = login(userId.trim().toLowerCase(), password);

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
    // On success, the App component will re-render with the dashboard
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern"></div>

      <div className="login-container">
        <div className="login-card glass-panel">
          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo">
              <span className="login-logo-icon">📊</span>
            </div>
            <h1>SKD ERP</h1>
            <p className="login-subtitle">Financial Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>User ID</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">👤</span>
                <input
                  type="text"
                  value={userId}
                  onChange={e => { setUserId(e.target.value); setError(''); }}
                  placeholder="Enter your User ID"
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your Password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="login-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className={`primary-btn login-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="login-spinner"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

export default LoginPage;
