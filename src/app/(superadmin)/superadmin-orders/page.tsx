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
  retailer: {
    id: string;
    name: string;
    code: string;
  };
  lines: { id: string; qty: number }[];
}

interface Retailer {
  id: string;
  name: string;
  code: string;
}

const statusBadgeClass: Record<string, string> = {
  SUBMITTED: 'badge-warning',
  CREATED_IN_LINNWORKS: 'badge-info',
  PROCESSING: 'badge-success',
  DELIVERED: 'badge-success',
  FAILED: 'badge-danger',
  CANCELLED: 'badge-neutral',
};

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Pending',
  CREATED_IN_LINNWORKS: 'Order Placed',
  PROCESSING: 'Processing',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const statusIcons: Record<string, string> = {
  SUBMITTED: '⏳',
  CREATED_IN_LINNWORKS: '📦',
  PROCESSING: '⚙️',
  DELIVERED: '✓',
  FAILED: '❌',
  CANCELLED: '🚫',
};

export default function SuperadminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRetailer, setFilterRetailer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function loadData() {
    try {
      const [ordersRes, retailersRes] = await Promise.all([
        fetch('/api/superadmin/orders'),
        fetch('/api/superadmin/retailers'),
      ]);

      const ordersData = await ordersRes.json();
      const retailersData = await retailersRes.json();

      if (ordersRes.ok) {
        setOrders(ordersData.orders);
      } else {
        setError(ordersData.error || 'Failed to load orders');
      }

      if (retailersRes.ok) {
        setRetailers(retailersData.retailers);
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync/linnworks', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSyncMessage(`Synced ${data.synced} order${data.synced !== 1 ? 's' : ''}`);
        if (data.synced > 0) {
          loadData(); // Reload orders if any were updated
        }
      } else {
        setSyncMessage(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      setSyncMessage('Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  }

  async function handleStatusUpdate(orderId: string, newStatus: string) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/superadmin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to update status');
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filterRetailer && order.retailer.id !== filterRetailer) return false;
    if (filterStatus && order.status !== filterStatus) return false;
    return true;
  });

  // Count orders by status
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Orders</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {syncMessage && (
            <span style={{ fontSize: '0.875rem', color: 'var(--sage)', fontWeight: 500 }}>
              {syncMessage}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {syncing ? '⟳ Syncing...' : '⟳ Sync with Linnworks'}
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { status: 'SUBMITTED', label: 'Pending', color: '#D4A854' },
          { status: 'CREATED_IN_LINNWORKS', label: 'Order Placed', color: '#4a9a9d' },
          { status: 'PROCESSING', label: 'Processing', color: '#7FB069' },
          { status: 'DELIVERED', label: 'Delivered', color: '#5a8a47' },
        ].map(({ status, label, color }) => (
          <div
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            style={{
              padding: '1rem',
              backgroundColor: filterStatus === status ? color : 'white',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: `2px solid ${filterStatus === status ? color : 'var(--gray-200)'}`,
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{statusIcons[status]}</div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: filterStatus === status ? 'white' : color,
            }}>
              {statusCounts[status] || 0}
            </div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: filterStatus === status ? 'rgba(255,255,255,0.9)' : 'var(--gray-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="label" style={{ marginBottom: 0 }}>Retailer:</label>
          <select
            className="input"
            style={{ width: '250px' }}
            value={filterRetailer}
            onChange={(e) => setFilterRetailer(e.target.value)}
          >
            <option value="">All retailers</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>
        {filterStatus && (
          <button
            onClick={() => setFilterStatus('')}
            className="btn btn-secondary btn-sm"
          >
            Clear status filter
          </button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gray-500)' }}>No orders found.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Order Ref</th>
                <th>PO Number</th>
                <th>Cases</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{order.retailer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                      {order.retailer.code}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{order.externalRef}</td>
                  <td>{order.poNumber || <span style={{ color: 'var(--gray-400)' }}>-</span>}</td>
                  <td>{order.lines.reduce((sum, line) => sum + line.qty, 0)}</td>
                  <td style={{ fontWeight: 600 }}>&pound;{Number(order.totalAmount).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{statusIcons[order.status]}</span>
                      <span className={`badge ${statusBadgeClass[order.status] || 'badge-info'}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Link href={`/orders/${order.id}`} className="btn btn-primary btn-sm">
                        View
                      </Link>
                      {/* Manual status update dropdown - for testing/override */}
                      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                        <select
                          className="input"
                          style={{ width: '120px', padding: '0.375rem 0.5rem', fontSize: '0.75rem' }}
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleStatusUpdate(order.id, e.target.value);
                            }
                          }}
                          disabled={updatingOrderId === order.id}
                        >
                          <option value="">Update...</option>
                          {order.status === 'SUBMITTED' && (
                            <option value="CREATED_IN_LINNWORKS">→ Order Placed</option>
                          )}
                          {(order.status === 'SUBMITTED' || order.status === 'CREATED_IN_LINNWORKS') && (
                            <option value="PROCESSING">→ Processing</option>
                          )}
                          {order.status === 'CREATED_IN_LINNWORKS' && (
                            <option value="PROCESSING">→ Processing</option>
                          )}
                          {order.status === 'PROCESSING' && (
                            <option value="DELIVERED">→ Delivered</option>
                          )}
                          <option value="CANCELLED">→ Cancel</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(157, 213, 216, 0.15)', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: 0 }}>
          <strong>Note:</strong> Order statuses are normally updated automatically by Linnworks.
          The manual update dropdown is for testing or override purposes only.
        </p>
      </div>
    </div>
  );
}
