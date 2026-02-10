'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  name: string;
  code: string;
  casePrice: number | null;
  paymentTermsDays: number;
}

interface CatalogItem {
  id: string;
  skuCode: string;
  name: string;
  basePrice: number;
  packSize: number;
  unitOfMeasure: string;
  imageUrl?: string;
  rangeName?: string;
}

interface CartItem extends CatalogItem {
  qty: number;
  price: number; // calculated based on store's casePrice
}

export default function SuperadminOrderPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  // Load stores on mount
  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch('/api/superadmin/retailers');
        const data = await res.json();
        if (res.ok) {
          // Only active stores with casePrice set
          const activeStores = data.retailers
            .filter((r: Store & { active: boolean }) => r.active)
            .map((r: Store & { active: boolean }) => ({
              id: r.id,
              name: r.name,
              code: r.code,
              casePrice: r.casePrice,
              paymentTermsDays: r.paymentTermsDays,
            }));
          setStores(activeStores);
        }
      } catch (err) {
        console.error('Failed to load stores:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStores();
  }, []);

  // Load catalog when store is selected
  useEffect(() => {
    if (!selectedStore) {
      setCatalog([]);
      return;
    }

    async function loadCatalog() {
      try {
        const res = await fetch('/api/catalog');
        const data = await res.json();
        if (res.ok) {
          setCatalog(data.catalog.map((item: CatalogItem) => ({
            ...item,
            basePrice: Number(item.basePrice),
          })));
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
      }
    }
    loadCatalog();

    // Clear cart when store changes
    setCart([]);
  }, [selectedStore]);

  // Calculate price for a SKU based on store's casePrice
  function getUnitPrice(item: CatalogItem): number {
    if (selectedStore?.casePrice) {
      // Use store's casePrice divided by pack size
      return Number(selectedStore.casePrice) / item.packSize;
    }
    // Fallback to base price
    return item.basePrice;
  }

  function getCasePrice(item: CatalogItem): number {
    if (selectedStore?.casePrice) {
      return Number(selectedStore.casePrice);
    }
    return item.basePrice * item.packSize;
  }

  function addToCart(item: CatalogItem) {
    const unitPrice = getUnitPrice(item);
    setCart((prev) => {
      const existing = prev.find((c) => c.skuCode === item.skuCode);
      if (existing) {
        return prev.map((c) =>
          c.skuCode === item.skuCode
            ? { ...c, qty: c.qty + item.packSize }
            : c
        );
      }
      return [...prev, { ...item, qty: item.packSize, price: unitPrice }];
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
    // Save cart to localStorage with the selected store
    const cartData = cart.map(item => ({
      skuCode: item.skuCode,
      name: item.name,
      price: item.price,
      qty: item.qty,
      packSize: item.packSize,
    }));
    localStorage.setItem('cart', JSON.stringify(cartData));
    localStorage.setItem('selectedStoreId', selectedStore?.id || '');
    router.push('/checkout');
  }

  // Filter stores by search
  const filteredStores = stores.filter((store) => {
    const search = searchTerm.toLowerCase();
    return (
      store.name.toLowerCase().includes(search) ||
      store.code.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>Loading...</div>
      </div>
    );
  }

  // Starting screen - no store selected
  if (!selectedStore) {
    return (
      <div>
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: 'linear-gradient(135deg, var(--forest) 0%, var(--teal) 100%)',
          borderRadius: '16px',
          color: 'white',
          marginBottom: '2rem',
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>
            Order Now
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.9 }}>
            Select a store to place an order on their behalf
          </p>
        </div>

        <div className="card">
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              className="input"
              placeholder="Search stores by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ maxWidth: '400px' }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {filteredStores.map((store) => (
              <div
                key={store.id}
                onClick={() => setSelectedStore(store)}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid var(--gray-200)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: 'white',
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
                <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                  {store.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                  {store.code}
                </div>
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.875rem',
                }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: store.casePrice ? 'rgba(127, 176, 105, 0.15)' : 'var(--gray-100)',
                    color: store.casePrice ? 'var(--sage)' : 'var(--gray-500)',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}>
                    {store.casePrice ? `£${Number(store.casePrice).toFixed(2)}/case` : 'No price set'}
                  </span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'var(--gray-100)',
                    borderRadius: '4px',
                  }}>
                    Net {store.paymentTermsDays}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredStores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
              No stores found matching "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    );
  }

  // Catalog view - store selected
  return (
    <div>
      {/* Store Header */}
      <div style={{
        background: 'var(--forest)',
        margin: '-2rem -1.5rem 2rem -1.5rem',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button
              onClick={() => setSelectedStore(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                padding: 0,
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              ← Change Store
            </button>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'white',
              margin: 0,
            }}>
              Order for {selectedStore.name}
            </h1>
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.8)',
            }}>
              <span style={{ fontFamily: 'monospace' }}>{selectedStore.code}</span>
              <span>•</span>
              <span style={{ fontWeight: 600 }}>
                {selectedStore.casePrice ? `£${Number(selectedStore.casePrice).toFixed(2)}/case` : 'Base pricing'}
              </span>
              <span>•</span>
              <span>Net {selectedStore.paymentTermsDays} days</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
        {/* Product Grid */}
        <div>
          {(() => {
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
                    const casePrice = getCasePrice(item);
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
                            <span className="product-price">£{casePrice.toFixed(2)}</span>
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
              Order for {selectedStore.name}
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
                    const casePrice = item.price * item.packSize;
                    const lineTotal = item.price * item.qty;
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
                            {cases} x £{casePrice.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600 }}>
                            £{lineTotal.toFixed(2)}
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
                    <span className="cart-total">£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                    Payment: Net {selectedStore.paymentTermsDays} days
                  </div>
                </div>

                <button
                  onClick={proceedToCheckout}
                  className="btn btn-teal btn-lg"
                  style={{ width: '100%' }}
                  disabled={cartTotal < 250}
                >
                  {cartTotal < 250 ? `£${(250 - cartTotal).toFixed(2)} more for minimum` : 'Continue to Checkout'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
