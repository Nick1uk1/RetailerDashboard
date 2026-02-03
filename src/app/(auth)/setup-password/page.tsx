'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(data.redirectTo || '/catalog');
      } else {
        setError(data.error || 'Failed to set password');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div className="card" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '2.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/images/logo.png"
            alt="Home Cooks"
            style={{
              height: '80px',
              width: 'auto',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}
          />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#122627',
            marginBottom: '0.5rem'
          }}>
            Set Your Password
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
            Create a password to secure your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="password" className="label">
              New Password
            </label>
            <input
              type="password"
              id="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
              style={{ padding: '0.875rem 1rem', fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="confirm-password" className="label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm-password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              style={{ padding: '0.875rem 1rem', fontSize: '1rem' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              backgroundColor: '#122627',
              padding: '0.875rem'
            }}
            disabled={loading}
          >
            {loading ? 'Setting password...' : 'Set Password & Continue'}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            backgroundColor: 'rgba(224, 122, 95, 0.15)',
            color: '#b85a3f',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
