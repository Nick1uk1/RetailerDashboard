'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderLine {
  id: string;
  skuCode: string;
  skuName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderEvent {
  id: string;
  eventType: string;
  payloadJson: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  externalRef: string;
  poNumber: string | null;
  notes: string | null;
  requestedDeliveryDate: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  lines: OrderLine[];
  linnworksMap: { pkOrderId: string } | null;
  events: OrderEvent[];
  retailer?: {
    name: string;
    code: string;
  };
}

// Status flow: SUBMITTED -> CREATED_IN_LINNWORKS -> PROCESSING -> SHIPPED
const STATUS_STEPS = [
  { key: 'CREATED_IN_LINNWORKS', label: 'Order Placed', icon: '📦' },
  { key: 'PROCESSING', label: 'Processing', icon: '⚙️' },
  { key: 'SHIPPED', label: 'Shipped', icon: '🚚' },
  { key: 'DELIVERED', label: 'Delivered', icon: '✓' },
];

function getStepStatus(orderStatus: string, stepKey: string): 'completed' | 'current' | 'pending' {
  const statusOrder = ['CREATED_IN_LINNWORKS', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentIndex = statusOrder.indexOf(orderStatus);
  const stepIndex = statusOrder.indexOf(stepKey);

  if (currentIndex === -1) return 'pending'; // SUBMITTED or FAILED
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
}

function OrderStatusTracker({ status }: { status: string }) {
  const isFailed = status === 'FAILED';
  const isCancelled = status === 'CANCELLED';
  const isSubmitted = status === 'SUBMITTED';

  if (isFailed) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'rgba(224, 122, 95, 0.1)',
        borderRadius: '12px',
        border: '2px solid var(--danger)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>❌</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>
          Order Failed
        </div>
        <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>
          There was an issue processing your order. Please contact support.
        </p>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'rgba(212, 168, 84, 0.1)',
        borderRadius: '12px',
        border: '2px solid var(--warning)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚫</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#9a7830' }}>
          Order Cancelled
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'rgba(157, 213, 216, 0.15)',
        borderRadius: '12px',
        border: '2px solid var(--teal)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏳</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--forest)' }}>
          Order Submitted
        </div>
        <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>
          Your order is being processed and will be confirmed shortly.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Progress line */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '40px',
          right: '40px',
          height: '4px',
          backgroundColor: 'var(--gray-200)',
          zIndex: 0,
        }} />
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '40px',
          height: '4px',
          backgroundColor: 'var(--sage)',
          zIndex: 1,
          width: `${Math.max(0, (STATUS_STEPS.findIndex(s => getStepStatus(status, s.key) === 'current') / (STATUS_STEPS.length - 1)) * 100)}%`,
          transition: 'width 0.5s ease',
        }} />

        {STATUS_STEPS.map((step, index) => {
          const stepStatus = getStepStatus(status, step.key);
          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                flex: 1,
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                backgroundColor: stepStatus === 'pending' ? 'var(--gray-100)' : stepStatus === 'current' ? 'var(--sage)' : 'var(--forest)',
                color: stepStatus === 'pending' ? 'var(--gray-400)' : 'white',
                border: stepStatus === 'current' ? '3px solid var(--forest)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                {stepStatus === 'completed' ? '✓' : step.icon}
              </div>
              <div style={{
                marginTop: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: stepStatus === 'current' ? 700 : 500,
                color: stepStatus === 'pending' ? 'var(--gray-400)' : 'var(--forest)',
                textAlign: 'center',
              }}>
                {step.label}
              </div>
              {stepStatus === 'current' && (
                <div style={{
                  marginTop: '0.25rem',
                  fontSize: '0.75rem',
                  color: 'var(--sage)',
                  fontWeight: 600,
                }}>
                  Current
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${params.id}`);
        const data = await res.json();

        if (res.ok) {
          setOrder(data.order);
        } else {
          setError(data.error || 'Failed to load order');
        }
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [params.id]);

  if (loading) {
    return <div>Loading order...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/orders" style={{ color: 'var(--gray-600)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          ← Back to Orders
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
            Order {order.externalRef}
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
            Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--forest)' }}>
            £{Number(order.totalAmount).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            {order.lines.reduce((sum, l) => sum + l.qty, 0)} items
          </div>
        </div>
      </div>

      {/* Order Status Tracker */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--forest)' }}>
          Order Status
        </h2>
        <OrderStatusTracker status={order.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--forest)' }}>
            Order Details
          </h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <dt style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>PO Number</dt>
            <dd style={{ fontWeight: 500 }}>{order.poNumber || '-'}</dd>
            <dt style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Requested Delivery</dt>
            <dd style={{ fontWeight: 500 }}>{order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString() : '-'}</dd>
            <dt style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Order Reference</dt>
            <dd style={{ fontFamily: 'monospace', fontWeight: 500 }}>{order.externalRef}</dd>
            {order.linnworksMap && (
              <>
                <dt style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Linnworks ID</dt>
                <dd style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{order.linnworksMap.pkOrderId}</dd>
              </>
            )}
          </dl>
          {order.notes && (
            <>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.5rem', color: 'var(--forest)' }}>
                Notes
              </h3>
              <p style={{ color: 'var(--gray-600)', fontSize: '0.875rem', backgroundColor: 'var(--gray-50)', padding: '0.75rem', borderRadius: '8px' }}>
                {order.notes}
              </p>
            </>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--forest)' }}>
            Order Summary
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gray-500)' }}>Line Items</span>
              <span style={{ fontWeight: 500 }}>{order.lines.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--gray-500)' }}>Total Quantity</span>
              <span style={{ fontWeight: 500 }}>{order.lines.reduce((sum, l) => sum + l.qty, 0)} units</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 700,
                fontSize: '1.25rem',
                paddingTop: '0.75rem',
                borderTop: '2px solid var(--gray-200)',
                color: 'var(--forest)',
              }}
            >
              <span>Total</span>
              <span>£{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--forest)', padding: '1.5rem 1.5rem 0' }}>
          Order Lines
        </h2>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{line.skuCode}</td>
                <td style={{ fontWeight: 500 }}>{line.skuName}</td>
                <td>{line.qty}</td>
                <td>£{Number(line.unitPrice).toFixed(2)}</td>
                <td style={{ fontWeight: 600 }}>£{Number(line.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.events.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--forest)' }}>
            Order Timeline
          </h2>
          <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '6px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--gray-200)',
            }} />
            {order.events.map((event, index) => (
              <div
                key={event.id}
                style={{
                  position: 'relative',
                  paddingBottom: index < order.events.length - 1 ? '1.25rem' : 0,
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '-1.5rem',
                  top: '4px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--sage)',
                  border: '2px solid white',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--forest)' }}>{event.eventType.replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.75rem' }}>
                    {new Date(event.createdAt).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
