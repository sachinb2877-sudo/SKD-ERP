import React, { useState } from 'react';
import { useERP } from '../hooks/useERP.js';

const LoginPage = () => {
  const { login } = useERP();

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

    const result = await login(userId.trim().toLowerCase(), password);

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
              <span className="login-logo-icon">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="20" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2.5"/>
                  <rect x="2" y="20" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="2.5"/>
                  <path d="M22 25l3 3 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
            <h1>SKD ERP</h1>
            <p className="login-subtitle">Financial Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>User ID</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M2 16c0-3 3-5.5 7-5.5s7 2.5 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
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
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
                  </svg>
                </span>
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 2l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M7.5 7.5a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 9s2.5-5 6-5c1 0 1.8.3 2.5.7M15 9s-1 2-3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M1 9s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{verticalAlign: 'middle', marginRight: '6px', flexShrink: 0}}>
                  <path d="M8 1l7 13H1L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M8 6v3M8 11.5v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
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
