'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  name: string;
  email: string;
  role: string;
  retailer: {
    name: string;
  } | null;
}

export function PortalHeader({ user }: { user: User }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const isAdmin = user.role === 'ADMIN';
  const isSuperadmin = user.role === 'SUPERADMIN';

  return (
    <header className="header">
      <div className="container header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href={isSuperadmin ? '/superadmin-retailers' : '/catalog'} style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--gray-900)' }}>
            {isSuperadmin ? 'Admin Portal' : 'Retailer Portal'}
          </Link>
          <nav className="nav">
            {!isSuperadmin && (
              <>
                <Link href="/catalog">Catalog</Link>
                <Link href="/orders">My Orders</Link>
                <Link href="/profile">Profile</Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link href="/admin-orders" style={{ color: 'var(--primary)' }}>
                  Admin: Orders
                </Link>
                <Link href="/admin-logs" style={{ color: 'var(--primary)' }}>
                  Admin: Logs
                </Link>
              </>
            )}
            {isSuperadmin && (
              <>
                <Link href="/superadmin-retailers" style={{ color: 'var(--primary)' }}>
                  Retailers
                </Link>
                <Link href="/superadmin-users" style={{ color: 'var(--primary)' }}>
                  Users
                </Link>
              </>
            )}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
            {user.name} {user.retailer ? `(${user.retailer.name})` : '(Superadmin)'}
          </span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
