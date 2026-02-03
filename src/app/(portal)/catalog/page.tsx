'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CatalogItem {
  id: string;
  skuCode: string;
  name: string;
  price: number;
  packSize: number;
  unitOfMeasure: string;
  imageUrl?: string;
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

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  function proceedToCheckout() {
    router.push('/checkout');
  }

  if (loading) {
    return <div>Loading catalog...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
      <div>
        <h1 className="page-title">Product Catalog</h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>All products sold in cases of 6</p>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}></th>
                <th>SKU</th>
                <th>Product</th>
                <th>Price per Case</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ width: '60px', height: '60px', backgroundColor: '#e5e7eb', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{item.skuCode}</td>
                  <td>{item.name}</td>
                  <td>&pound;{(Number(item.price) * item.packSize).toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => addToCart(item)}
                      className="btn btn-primary"
                    >
                      Add Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="page-title">Cart</h2>
        <div className="card">
          {cart.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: '2rem 0' }}>
              Your cart is empty
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                {cart.map((item) => {
                  const cases = item.qty / item.packSize;
                  const casePrice = Number(item.price) * item.packSize;
                  return (
                    <div
                      key={item.skuCode}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--gray-200)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {item.skuCode} - &pound;{casePrice.toFixed(2)}/case
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          value={cases}
                          onChange={(e) => updateQty(item.skuCode, (parseInt(e.target.value) || 0) * item.packSize)}
                          min={1}
                          step={1}
                          className="input"
                          style={{ width: '60px' }}
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>cases</span>
                        <button
                          onClick={() => removeFromCart(item.skuCode)}
                          className="btn btn-danger"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 600,
                  fontSize: '1.125rem',
                  marginBottom: '1rem',
                }}
              >
                <span>Total:</span>
                <span>&pound;{cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={proceedToCheckout}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Proceed to Checkout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
