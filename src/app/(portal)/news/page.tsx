'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserInfo {
  name: string;
  retailerName: string | null;
  isSuperadmin: boolean;
}

export default function NewsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser({
            name: data.user.name,
            retailerName: data.user.retailer?.name || null,
            isSuperadmin: data.user.role === 'SUPERADMIN',
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ margin: '-1.5rem -1.5rem 0 -1.5rem' }}>
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--forest) 0%, #013d42 100%)',
          padding: '4rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(150, 197, 177, 0.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(150, 197, 177, 0.08)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(150, 197, 177, 0.2)',
              borderRadius: '20px',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ color: '#96c5b1', fontSize: '0.875rem', fontWeight: 600 }}>
              Retailer Ordering Portal
            </span>
          </div>

          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              color: '#fffdf6',
              marginBottom: '1rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: 'rgba(255, 253, 246, 0.85)',
              marginBottom: '2rem',
              maxWidth: '600px',
              margin: '0 auto 2rem',
              lineHeight: 1.6,
            }}
          >
            Delicious, balanced recipes created by independent chefs.
            Ready to serve, ready to sell.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={user?.isSuperadmin ? '/superadmin-order' : '/catalog'}
              className="btn"
              style={{
                backgroundColor: '#96c5b1',
                color: 'var(--forest)',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Start Ordering
            </Link>
            <Link
              href="/orders"
              className="btn"
              style={{
                backgroundColor: 'transparent',
                color: '#fffdf6',
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: '2px solid rgba(255, 253, 246, 0.3)',
                textDecoration: 'none',
              }}
            >
              View Orders
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '3rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Quick Stats for logged in user */}
        {user && !user.isSuperadmin && user.retailerName && (
          <div
            style={{
              backgroundColor: 'rgba(150, 197, 177, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(150, 197, 177, 0.2)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--forest)', fontWeight: 500 }}>
              Ordering for: <strong>{user.retailerName}</strong>
            </p>
          </div>
        )}

        {/* News & Updates Section */}
        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--forest)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>📢</span>
          News & Updates
        </h2>

        <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '3rem' }}>
          {/* Update Card 1 */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderLeft: '4px solid var(--sage)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span
                style={{
                  backgroundColor: 'rgba(127, 176, 105, 0.15)',
                  color: 'var(--sage)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                NEW
              </span>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Feb 2026</span>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--forest)', marginBottom: '0.5rem' }}>
              Welcome to the New Ordering Portal
            </h3>
            <p style={{ color: 'var(--gray-600)', margin: 0, lineHeight: 1.6 }}>
              We've launched our brand new retailer ordering portal! You can now browse our full product catalog,
              place orders directly, and track your order history all in one place.
            </p>
          </div>

          {/* Update Card 2 */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderLeft: '4px solid var(--teal)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span
                style={{
                  backgroundColor: 'rgba(157, 213, 216, 0.2)',
                  color: 'var(--teal)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                PRODUCTS
              </span>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Feb 2026</span>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--forest)', marginBottom: '0.5rem' }}>
              Full Range Available
            </h3>
            <p style={{ color: 'var(--gray-600)', margin: 0, lineHeight: 1.6 }}>
              Our complete range of balanced, chef-crafted ready meals is now available to order.
              Each recipe developed by independent chefs for great taste and nutrition.
            </p>
          </div>

          {/* Update Card 3 */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderLeft: '4px solid #D4A854',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span
                style={{
                  backgroundColor: 'rgba(212, 168, 84, 0.15)',
                  color: '#D4A854',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                DELIVERY
              </span>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Ongoing</span>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--forest)', marginBottom: '0.5rem' }}>
              Fast Delivery
            </h3>
            <p style={{ color: 'var(--gray-600)', margin: 0, lineHeight: 1.6 }}>
              Orders are processed within 24-48 hours and delivered directly to your store.
              Need to report an issue? You can request credit within 48 hours of delivery.
            </p>
          </div>
        </div>

        {/* Quick Links Section */}
        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--forest)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🚀</span>
          Quick Links
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
          }}
        >
          <Link
            href={user?.isSuperadmin ? '/superadmin-order' : '/catalog'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--sage)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: 'rgba(127, 176, 105, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}
            >
              🛒
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--forest)' }}>Browse Catalog</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>View all products</div>
            </div>
          </Link>

          <Link
            href="/orders"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--teal)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: 'rgba(157, 213, 216, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}
            >
              📦
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--forest)' }}>Order History</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Track your orders</div>
            </div>
          </Link>

          <a
            href="mailto:orders@homecooks.app"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1.25rem',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '2px solid var(--gray-200)',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#D4A854';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                backgroundColor: 'rgba(212, 168, 84, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
              }}
            >
              ✉️
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--forest)' }}>Contact Us</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Get in touch</div>
            </div>
          </a>
        </div>

        {/* Footer Note */}
        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: 'var(--gray-100)',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.875rem' }}>
            Need help? Contact us at{' '}
            <a href="mailto:orders@homecooks.app" style={{ color: 'var(--forest)', fontWeight: 500 }}>
              orders@homecooks.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
