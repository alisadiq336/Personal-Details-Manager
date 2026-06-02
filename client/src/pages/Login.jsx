import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../state/AppContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [remember, setRemember] = useState(() => localStorage.getItem('pdm_remember') !== 'false');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password) {
      setError('Enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = await apiRequest('/auth/login', {
        method: 'POST',
        body: form
      });
      login(auth, remember);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-copy" aria-label="Product summary">
        <div className="login-copy-mark">
          <ShieldCheck size={28} />
        </div>
        <span>Secure workspace</span>
        <h1>Personal Details Manager</h1>
        <p>Organize records, documents, exports, and profile details from one focused admin dashboard.</p>
        <div className="login-metrics">
          <strong>Admin</strong>
          <strong>Records</strong>
          <strong>Reports</strong>
        </div>
      </section>
      <section className="login-panel" aria-label="Admin login">
        <div className="brand-mark">
          <LockKeyhole size={28} />
        </div>
        <span className="view-eyebrow">Welcome back</span>
        <h1>Sign in</h1>
        <p>Use your admin account to continue.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              autoComplete="current-password"
            />
          </label>
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember me
            </label>
            <button
              type="button"
              className="link-button"
              onClick={() => setHint('Use the ADMIN_USERNAME and ADMIN_PASSWORD configured in your server environment. Password changes should be made there for this deployment.')}
            >
              Forgot password?
            </button>
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          {hint ? <div className="auth-hint"><KeyRound size={16} />{hint}</div> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
