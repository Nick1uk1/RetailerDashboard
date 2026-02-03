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
}

const statusBadgeClass: Record<string, string> = {
  SUBMITTED: 'badge-info',
  CREATED_IN_LINNWORKS: 'badge-success',
  FAILED: 'badge-danger',
  CANCELLED: 'badge-warning',
};

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  CREATED_IN_LINNWORKS: 'Confirmed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

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
        <Link href="/orders" style={{ color: 'var(--gray-600)' }}>
          &larr; Back to Orders
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Order {order.externalRef}
        </h1>
        <span className={`badge ${statusBadgeClass[order.status] || 'badge-info'}`}>
          {statusLabels[order.status] || order.status}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Details</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <dt style={{ color: 'var(--gray-500)' }}>PO Number</dt>
            <dd>{order.poNumber || '-'}</dd>
            <dt style={{ color: 'var(--gray-500)' }}>Requested Delivery</dt>
            <dd>{order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString() : '-'}</dd>
            <dt style={{ color: 'var(--gray-500)' }}>Created</dt>
            <dd>{new Date(order.createdAt).toLocaleString()}</dd>
            <dt style={{ color: 'var(--gray-500)' }}>Linnworks ID</dt>
            <dd style={{ fontFamily: 'monospace' }}>{order.linnworksMap?.pkOrderId || '-'}</dd>
          </dl>
          {order.notes && (
            <>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>
                Notes
              </h3>
              <p style={{ color: 'var(--gray-600)' }}>{order.notes}</p>
            </>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--gray-500)' }}>Items</span>
            <span>{order.lines.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--gray-500)' }}>Total Quantity</span>
            <span>{order.lines.reduce((sum, l) => sum + l.qty, 0)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 600,
              fontSize: '1.125rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--gray-200)',
            }}
          >
            <span>Total</span>
            <span>&pound;{Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Lines</h2>
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
                <td style={{ fontFamily: 'monospace' }}>{line.skuCode}</td>
                <td>{line.skuName}</td>
                <td>{line.qty}</td>
                <td>&pound;{Number(line.unitPrice).toFixed(2)}</td>
                <td>&pound;{Number(line.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Order History</h2>
        <div>
          {order.events.map((event) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid var(--gray-200)',
              }}
            >
              <div>
                <span className="badge badge-info">{event.eventType}</span>
              </div>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
