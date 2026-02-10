'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface CatalogItem {
  id: string;
  skuCode: string;
  name: string;
  price: number;
  packSize: number;
  unitOfMeasure: string;
  imageUrl?: string;
  rangeName?: string;
  rangeId?: string;
}

interface CartItem extends CatalogItem {
  qty: number;
}

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();

        if (res.ok) {
          setCatalog(data.catalog);
        } else {
          setError(data.error || 'Failed to load catalog');
        }
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();

    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.skuCode === item.skuCode);
      if (existing) {
        return prev.map((c) =>
          c.skuCode === item.skuCode
            ? { ...c, qty: c.qty + item.packSize }
            : c
        );
      }
      return [...prev, { ...item, qty: item.packSize }];
    });
  }

  function updateQty(skuCode: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.skuCode !== skuCode));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.skuCode === skuCode ? { ...c, qty } : c))
      );
    }
  }

  function removeFromCart(skuCode: string) {
    setCart((prev) => prev.filter((c) => c.skuCode !== skuCode));
  }

  function getCartQty(skuCode: string): number {
    const item = cart.find((c) => c.skuCode === skuCode);
    return item ? item.qty / item.packSize : 0;
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty / item.packSize, 0);

  function proceedToCheckout() {
    router.push('/checkout');
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>Loading...</div>
        <p>Fetching your catalog</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--danger)', fontSize: '1.125rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div
        style={{
          background: 'var(--forest)',
          margin: '-1.5rem -1.5rem 2rem -1.5rem',
          padding: '2rem 1.5rem',
          borderRadius: '0 0 1rem 1rem',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#FFFDF6',
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em'
              }}>
                SKU List
              </h1>
              <p style={{ color: 'rgba(255,253,246,0.7)', fontSize: '1rem' }}>
                Fresh meals, ready to serve. All products sold in cases.
              </p>
            </div>
            <img
              src="/images/hero.jpg"
              alt="Home Cooks meals"
              style={{
                width: '180px',
                height: '100px',
                objectFit: 'cover',
                borderRadius: '10px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
        {/* Product Grid - Grouped by Range */}
        <div>
          {(() => {
            // Group catalog items by range
            const rangeGroups = catalog.reduce((acc, item) => {
              const rangeName = item.rangeName || 'Other';
              if (!acc[rangeName]) acc[rangeName] = [];
              acc[rangeName].push(item);
              return acc;
            }, {} as Record<string, CatalogItem[]>);

            return Object.entries(rangeGroups).map(([rangeName, items]) => (
              <div key={rangeName} style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--teal)',
                  borderRadius: '8px',
                  color: 'white',
                }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    {rangeName}
                  </h2>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.125rem 0.5rem',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                  }}>
                    {items.length} products
                  </span>
                </div>

                <div className="product-grid">
                  {items.map((item) => {
                    const casePrice = Number(item.price) * item.packSize;
                    const inCart = getCartQty(item.skuCode);

                    return (
                      <div key={item.id} className="product-card">
                        <div className="product-image">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '3rem',
                              opacity: 0.3
                            }}>
                              🍽️
                            </div>
                          )}
                        </div>
                        <div className="product-info">
                          <div className="product-sku">{item.skuCode}</div>
                          <div className="product-name">{item.name}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <span className="product-price">&pound;{casePrice.toFixed(2)}</span>
                            <span className="product-pack">per case of {item.packSize}</span>
                          </div>

                          {inCart > 0 ? (
                            <div className="qty-control">
                              <button
                                className="qty-btn"
                                onClick={() => updateQty(item.skuCode, (inCart - 1) * item.packSize)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={inCart}
                                onChange={(e) => updateQty(item.skuCode, (parseInt(e.target.value) || 0) * item.packSize)}
                                className="qty-input"
                                min={0}
                              />
                              <button
                                className="qty-btn"
                                onClick={() => updateQty(item.skuCode, (inCart + 1) * item.packSize)}
                              >
                                +
                              </button>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginLeft: '0.25rem' }}>
                                cases
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="btn btn-primary"
                              style={{ width: '100%', marginTop: '0.75rem' }}
                            >
                              Add to Order
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Cart Sidebar */}
        <div>
          <div className="cart-summary">
            <h3>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.8 }}>
                <path d="M6 6h12l-1.5 9h-9L6 6zm0 0L5 3H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="18" r="1" fill="currentColor"/>
                <circle cx="15" cy="18" r="1" fill="currentColor"/>
              </svg>
              Your Order
              {cartItemCount > 0 && (
                <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                  {cartItemCount} {cartItemCount === 1 ? 'case' : 'cases'}
                </span>
              )}
            </h3>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.6 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛒</div>
                <p>Your order is empty</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Add products from the catalog
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  marginBottom: '1rem',
                  marginRight: '-0.5rem',
                  paddingRight: '0.5rem'
                }}>
                  {cart.map((item) => {
                    const cases = item.qty / item.packSize;
                    const casePrice = Number(item.price) * item.packSize;
                    const lineTotal = Number(item.price) * item.qty;
                    return (
                      <div
                        key={item.skuCode}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          padding: '0.75rem 0',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                            {cases} x &pound;{casePrice.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600 }}>
                            &pound;{lineTotal.toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.skuCode)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255,255,255,0.5)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  borderTop: '2px solid rgba(255,255,255,0.2)',
                  paddingTop: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem'
                  }}>
                    <span style={{ opacity: 0.7 }}>Subtotal</span>
                    <span className="cart-total">&pound;{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                    Excludes VAT and delivery
                  </div>
                </div>

                <button
                  onClick={proceedToCheckout}
                  className="btn btn-teal btn-lg"
                  style={{ width: '100%' }}
                >
                  Continue to Checkout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
