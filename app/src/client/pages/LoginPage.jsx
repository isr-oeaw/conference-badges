import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();

  const error = searchParams.get('error');
  const errorMessage =
    error === 'invalid_token'
      ? 'This login link is invalid or has expired.'
      : error === 'missing_token'
        ? 'Missing login token.'
        : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const result = await api.requestLink(email);
      setStatus(result.message);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page narrow">
      <div className="card">
        <h1>Conference Badges</h1>
        <p className="muted">Sign in with your @oeaw.ac.at email address. We will send you a login link.</p>

        {errorMessage && <p className="error">{errorMessage}</p>}

        <form onSubmit={handleSubmit} className="stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@oeaw.ac.at"
              required
              autoComplete="email"
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send login link'}
          </button>
        </form>

        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
}
