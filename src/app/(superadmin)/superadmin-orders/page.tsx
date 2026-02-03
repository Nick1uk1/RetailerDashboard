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
  lines: { id: string }[];
}

interface Retailer {
  id: string;
  name: string;
  code: string;
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

export default function SuperadminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRetailer, setFilterRetailer] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
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

    loadData();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (filterRetailer && order.retailer.id !== filterRetailer) return false;
    if (filterStatus && order.status !== filterStatus) return false;
    return true;
  });

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
          <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="label" style={{ marginBottom: 0 }}>Status:</label>
          <select
            className="input"
            style={{ width: '150px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CREATED_IN_LINNWORKS">Confirmed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
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
                <th>Items</th>
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
                  <td>{order.lines.length}</td>
                  <td style={{ fontWeight: 600 }}>&pound;{Number(order.totalAmount).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass[order.status] || 'badge-info'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <Link href={`/orders/${order.id}`} className="btn btn-primary btn-sm">
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
