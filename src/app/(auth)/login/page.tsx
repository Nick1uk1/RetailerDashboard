'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const router = useRouter();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/catalog');
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || 'Check your email for the login link.');
      } else {
        setError(data.error || 'Failed to send login link');
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
        position: 'relative',
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
            Retailer Portal
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: '0.9375rem' }}>
            {showMagicLink ? 'Enter your email to receive a login link' : 'Sign in to your account'}
          </p>
        </div>

        {!showMagicLink ? (
          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                type="email"
                id="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ padding: '0.875rem 1rem', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowMagicLink(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--forest)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Forgot password? Use magic link
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleMagicLink}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="email-magic" className="label">
                Email address
              </label>
              <input
                type="email"
                id="email-magic"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
              {loading ? 'Sending...' : 'Send Login Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowMagicLink(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--forest)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Back to password login
              </button>
            </div>
          </form>
        )}

        {message && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            backgroundColor: 'rgba(127, 176, 105, 0.15)',
            color: '#5a8a47',
            borderRadius: '0.5rem',
            fontSize: '0.9375rem',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

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

        <p style={{
          marginTop: '2rem',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: 'var(--gray-500)'
        }}>
          Need access? Contact your account manager.
        </p>
      </div>
    </div>
  );
}
