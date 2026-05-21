import { LockKeyhole } from 'lucide-react';
import React, { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../state/AppContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
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
      login(auth);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Admin login">
        <div className="brand-mark">
          <LockKeyhole size={28} />
        </div>
        <h1>Personal Details Manager</h1>
        <p>Admin access</p>

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
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
