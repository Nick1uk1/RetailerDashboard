'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  skuCode: string;
  name: string;
  price: number;
  qty: number;
  packSize: number;
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
  paymentTermsDays: number;
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [isIdempotent, setIsIdempotent] = useState(false);
  const [isChain, setIsChain] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [groupName, setGroupName] = useState('');
  const router = useRouter();

  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      if (parsed.length === 0) {
        router.push('/catalog');
      }
      setCart(parsed);
    } else {
      router.push('/catalog');
    }

    // Fetch stores for chain dropdown or superadmin
    fetch('/api/stores')
      .then((res) => res.json())
      .then((data) => {
        setIsSuperadmin(data.isSuperadmin || false);
        setIsChain(data.isChain || false);
        setStores(data.stores || []);
        setGroupName(data.groupName || '');

        // For superadmins, default to first store (they'll select at checkout)
        if (data.isSuperadmin) {
          setSelectedStoreId(data.stores[0]?.id || '');
        } else {
          setSelectedStoreId(data.defaultStoreId);
        }
      })
      .catch(console.error);
  }, [router]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Get payment terms for selected store
  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const paymentTermsDays = selectedStore?.paymentTermsDays || 30;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: cart.map((item) => ({
            skuCode: item.skuCode,
            qty: item.qty,
          })),
          poNumber: poNumber || undefined,
          notes: notes || undefined,
          storeRetailerId: selectedStoreId || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setOrderId(data.order.id);
        setIsIdempotent(data.isIdempotent || false);
        localStorage.removeItem('cart');
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        setErrors([{ field: 'general', code: 'ERROR', message: data.error || 'Failed to create order' }]);
      }
    } catch (err) {
      setErrors([{ field: 'general', code: 'ERROR', message: 'Something went wrong' }]);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isIdempotent ? '⚠️' : '✓'}</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          {isIdempotent ? 'Duplicate Order Detected' : 'Order Submitted Successfully!'}
        </h1>
        <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
          {isIdempotent
            ? 'You already placed an identical order today. We\'ve linked you to the existing order instead of creating a duplicate.'
            : 'Your order has been placed and is being processed.'}
        </p>
        <div style={{
          backgroundColor: 'rgba(127, 176, 105, 0.15)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
        }}>
          <p style={{ color: '#5a8a47', fontWeight: 500, margin: 0 }}>
            Payment Terms: Net {paymentTermsDays} days from delivery
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => router.push(`/orders/${orderId}`)} className="btn btn-primary">
            View Order
          </button>
          <button onClick={() => router.push('/catalog')} className="btn btn-secondary">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-title">Checkout</h1>

      {errors.length > 0 && (
        <div className="card" style={{ backgroundColor: '#fee2e2', marginBottom: '1rem' }}>
          <h3 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>Please fix the following errors:</h3>
          <ul style={{ paddingLeft: '1.5rem', color: '#991b1b' }}>
            {errors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Cases</th>
              <th>Price/Case</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => {
              const cases = item.qty / item.packSize;
              const casePrice = Number(item.price) * item.packSize;
              return (
                <tr key={item.skuCode}>
                  <td>{item.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{item.skuCode}</td>
                  <td>{cases}</td>
                  <td>&pound;{casePrice.toFixed(2)}</td>
                  <td>&pound;{(item.price * item.qty).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>Total:</td>
              <td style={{ fontWeight: 600 }}>&pound;{cartTotal.toFixed(2)}</td>
            </tr>
            {cartTotal < 250 && (
              <tr>
                <td colSpan={5} style={{
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  backgroundColor: '#fee2e2',
                  padding: '0.75rem',
                  fontWeight: 600,
                }}>
                  ⚠️ Minimum order value is £250.00 (£{(250 - cartTotal).toFixed(2)} more needed)
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Order Details</h2>

        {(isSuperadmin || (isChain && stores.length > 1)) && (
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="store" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              {isSuperadmin ? 'Order for Store' : `Select Store (${groupName})`}
            </label>
            <select
              id="store"
              className="input"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              required
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} {isSuperadmin && `(${store.code})`}
                </option>
              ))}
            </select>
            {isSuperadmin && (
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                Superadmin: placing order on behalf of this store
              </p>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="poNumber" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            PO Number (optional)
          </label>
          <input
            type="text"
            id="poNumber"
            className="input"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            placeholder="Your purchase order number"
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Order Notes (optional)
          </label>
          <textarea
            id="notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special instructions for this order"
          />
        </div>

        {/* Payment Terms Notice */}
        <div style={{
          backgroundColor: 'rgba(18, 38, 39, 0.05)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          borderLeft: '4px solid var(--forest)',
        }}>
          <p style={{ margin: 0, color: 'var(--forest)', fontWeight: 500 }}>
            Payment Terms: Net {paymentTermsDays} days from delivery
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || cartTotal < 250}
            title={cartTotal < 250 ? 'Minimum order value is £250' : undefined}
          >
            {loading ? 'Submitting...' : 'Submit Order'}
          </button>
          <button type="button" onClick={() => router.push('/catalog')} className="btn btn-secondary">
            Back to Catalog
          </button>
          {cartTotal < 250 && (
            <span style={{ color: '#991b1b', fontSize: '0.875rem', fontWeight: 500 }}>
              Add more items to reach £250 minimum
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
