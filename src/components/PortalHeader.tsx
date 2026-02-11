'use client';

import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const isAdmin = user.role === 'ADMIN';
  const isSuperadmin = user.role === 'SUPERADMIN';

  const isActive = (path: string) => pathname === path;

  return (
    <header className="header">
      <div className="container header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <Link
            href="/news"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img
              src="/images/logo-white.png"
              alt="Home Cooks"
              style={{
                height: '36px',
                width: 'auto',
              }}
            />
          </Link>
          <nav className="nav">
            {/* News & Updates - visible to all users */}
            <Link href="/news" className={isActive('/news') ? 'active' : ''}>
              News
            </Link>
            {isSuperadmin && (
              <>
                <Link href="/superadmin-order" className={isActive('/superadmin-order') ? 'active' : ''}>
                  Order Now
                </Link>
                <span style={{ opacity: 0.3, margin: '0 0.25rem' }}>|</span>
                <Link href="/superadmin-retailers" className={isActive('/superadmin-retailers') ? 'active' : ''}>
                  Retailers
                </Link>
                <Link href="/superadmin-users" className={isActive('/superadmin-users') ? 'active' : ''}>
                  Users
                </Link>
                <Link href="/superadmin-orders" className={isActive('/superadmin-orders') ? 'active' : ''}>
                  All Orders
                </Link>
                <span style={{ opacity: 0.3, margin: '0 0.25rem' }}>|</span>
              </>
            )}
            {(user.retailer || !isSuperadmin) && (
              <>
                <Link href="/catalog" className={isActive('/catalog') ? 'active' : ''}>
                  SKU List
                </Link>
                <Link href="/orders" className={isActive('/orders') ? 'active' : ''}>
                  Orders
                </Link>
              </>
            )}
            {!isSuperadmin && (
              <Link href="/profile" className={isActive('/profile') ? 'active' : ''}>
                Profile
              </Link>
            )}
            {isAdmin && (
              <>
                <Link href="/admin-orders" className={isActive('/admin-orders') ? 'active' : ''}>
                  Admin Orders
                </Link>
                <Link href="/admin-logs" className={isActive('/admin-logs') ? 'active' : ''}>
                  Logs
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="user-menu">
          <div className="user-info">
            <strong>{user.name}</strong>
            {user.retailer && (
              <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                {user.retailer.name}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
