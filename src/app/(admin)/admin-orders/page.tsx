'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  externalRef: string;
  poNumber: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  retailer: {
    name: string;
    code: string;
  };
  lines: { id: string }[];
  linnworksMap: { pkOrderId: string } | null;
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<{ orderId: string; message: string; success: boolean } | null>(null);

  async function loadOrders() {
    try {
      const res = await fetch('/api/admin/orders');
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

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleRetry(orderId: string) {
    setRetrying(orderId);
    setRetryResult(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/retry`, {
        method: 'POST',
      });
      const data = await res.json();

      setRetryResult({
        orderId,
        message: data.message || data.error,
        success: res.ok,
      });

      if (res.ok) {
        loadOrders();
      }
    } catch (err) {
      setRetryResult({
        orderId,
        message: 'Failed to retry order',
        success: false,
      });
    } finally {
      setRetrying(null);
    }
  }

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div>
      <h1 className="page-title">Admin: All Orders</h1>

      {retryResult && (
        <div
          className="card"
          style={{
            backgroundColor: retryResult.success ? '#dcfce7' : '#fee2e2',
            marginBottom: '1rem',
          }}
        >
          <p style={{ color: retryResult.success ? '#166534' : '#991b1b' }}>
            {retryResult.message}
          </p>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Retailer</th>
              <th>PO Number</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Linnworks ID</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={{ fontFamily: 'monospace' }}>{order.externalRef}</td>
                <td>
                  <div>{order.retailer.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {order.retailer.code}
                  </div>
                </td>
                <td>{order.poNumber || '-'}</td>
                <td>{order.lines.length}</td>
                <td>&pound;{Number(order.totalAmount).toFixed(2)}</td>
                <td>
                  <span className={`badge ${statusBadgeClass[order.status] || 'badge-info'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {order.linnworksMap?.pkOrderId.substring(0, 8) || '-'}
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  {order.status === 'FAILED' && !order.linnworksMap && (
                    <button
                      onClick={() => handleRetry(order.id)}
                      disabled={retrying === order.id}
                      className="btn btn-primary"
                    >
                      {retrying === order.id ? 'Retrying...' : 'Retry'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
