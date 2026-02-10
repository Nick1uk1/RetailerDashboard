'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifiedRef = useRef(false);

  useEffect(() => {
    // Prevent double-call in React Strict Mode
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No token provided');
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage('Successfully logged in! Redirecting...');
          const redirectTo = data.redirectTo || '/catalog';
          setTimeout(() => router.push(redirectTo), 1500);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Something went wrong');
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        {status === 'loading' && 'Verifying...'}
        {status === 'success' && 'Success!'}
        {status === 'error' && 'Error'}
      </h1>
      <p style={{ color: status === 'error' ? 'var(--danger)' : 'var(--gray-600)' }}>
        {message || 'Please wait while we verify your login link...'}
      </p>
      {status === 'error' && (
        <a href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Login
        </a>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <Suspense fallback={
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            Verifying...
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Please wait while we verify your login link...
          </p>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
