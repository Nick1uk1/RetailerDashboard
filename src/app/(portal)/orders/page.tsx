'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  externalRef: string;
  poNumber: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  lines: { id: string }[];
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();

        if (res.ok) {
          setOrders(data.orders);
        } else {
          setError(data.error || 'Failed to load orders');
        }
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div>
      <h1 className="page-title">My Orders</h1>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>
            You haven&apos;t placed any orders yet.
          </p>
          <Link href="/catalog" className="btn btn-primary">
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Order Reference</th>
                <th>PO Number</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontFamily: 'monospace' }}>{order.externalRef}</td>
                  <td>{order.poNumber || '-'}</td>
                  <td>{order.lines.length} item(s)</td>
                  <td>&pound;{Number(order.totalAmount).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass[order.status] || 'badge-info'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/orders/${order.id}`} className="btn btn-secondary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
