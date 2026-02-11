'use client';

import { useEffect, useState } from 'react';

interface AffectedItem {
  skuCode: string;
  skuName: string;
  units: number;
}

interface CreditRequest {
  id: string;
  orderId: string;
  orderRef: string;
  retailer: {
    id: string;
    name: string;
    code: string;
  };
  requestedBy: {
    name: string;
    email: string;
  };
  description: string;
  affectedItems: AffectedItem[];
  photoUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  creditAmount: number | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  orderTotal: number;
}

export default function SuperadminCreditsPage() {
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
  const [resolving, setResolving] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  async function loadCreditRequests() {
    try {
      const res = await fetch('/api/superadmin/credit-requests');
      const data = await res.json();
      if (res.ok) {
        setCreditRequests(data.creditRequests);
      } else {
        setError(data.error || 'Failed to load credit requests');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCreditRequests();
  }, []);

  async function handleResolve(status: 'APPROVED' | 'REJECTED') {
    if (!selectedRequest) return;
    if (status === 'APPROVED' && (!creditAmount || parseFloat(creditAmount) <= 0)) {
      alert('Please enter a valid credit amount');
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/superadmin/credit-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          creditAmount: status === 'APPROVED' ? parseFloat(creditAmount) : undefined,
          resolutionNote: resolutionNote || undefined,
        }),
      });

      if (res.ok) {
        setSelectedRequest(null);
        setCreditAmount('');
        setResolutionNote('');
        loadCreditRequests();
      }
    } catch (err) {
      console.error('Failed to resolve credit request');
    } finally {
      setResolving(false);
    }
  }

  const filteredRequests = filterStatus
    ? creditRequests.filter(cr => cr.status === filterStatus)
    : creditRequests;

  const pendingCount = creditRequests.filter(cr => cr.status === 'PENDING').length;

  if (loading) {
    return <div>Loading credit requests...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          Credit Requests
          {pendingCount > 0 && (
            <span
              style={{
                marginLeft: '0.75rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: '#D4A854',
                color: 'white',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {pendingCount} pending
            </span>
          )}
        </h1>
      </div>

      {/* Status Filter */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-secondary'}`}
          >
            {status || 'All'} ({status ? creditRequests.filter(cr => cr.status === status).length : creditRequests.length})
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--gray-500)' }}>No credit requests found.</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Retailer</th>
                <th>Order</th>
                <th>Requested By</th>
                <th>Items Affected</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((cr) => (
                <tr key={cr.id}>
                  <td style={{ fontSize: '0.875rem' }}>
                    {new Date(cr.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{cr.retailer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                      {cr.retailer.code}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{cr.orderRef}</td>
                  <td>
                    <div>{cr.requestedBy.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{cr.requestedBy.email}</div>
                  </td>
                  <td>
                    {cr.affectedItems.reduce((sum, item) => sum + item.units, 0)} units
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {cr.affectedItems.length} SKU{cr.affectedItems.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        cr.status === 'PENDING'
                          ? 'badge-warning'
                          : cr.status === 'APPROVED'
                          ? 'badge-success'
                          : 'badge-danger'
                      }`}
                    >
                      {cr.status}
                    </span>
                    {cr.creditAmount && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--sage)', fontWeight: 600, marginTop: '0.25rem' }}>
                        £{cr.creditAmount.toFixed(2)} credited
                      </div>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedRequest(cr);
                        setCreditAmount(cr.creditAmount?.toString() || '');
                        setResolutionNote(cr.resolutionNote || '');
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      {cr.status === 'PENDING' ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: 'var(--forest)', marginBottom: '0.25rem' }}>Credit Request</h2>
                <p style={{ color: 'var(--gray-500)', margin: 0, fontSize: '0.875rem' }}>
                  {selectedRequest.retailer.name} • Order {selectedRequest.orderRef}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Description</label>
              <p style={{ margin: 0, padding: '0.75rem', backgroundColor: 'var(--gray-100)', borderRadius: '8px' }}>
                {selectedRequest.description}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Affected Items</label>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Units Affected</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequest.affectedItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{item.skuCode}</td>
                      <td>{item.skuName}</td>
                      <td style={{ fontWeight: 600 }}>{item.units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Photos ({selectedRequest.photoUrls.length})</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedRequest.photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setViewingPhoto(url)}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid var(--gray-200)',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Damage photo ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedRequest.status === 'PENDING' ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="label">Credit Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Enter credit amount"
                    style={{ maxWidth: '200px' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                    Order total: £{selectedRequest.orderTotal.toFixed(2)}
                  </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="label">Resolution Note (optional)</label>
                  <textarea
                    className="input"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={2}
                    placeholder="Add a note about the resolution..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleResolve('APPROVED')}
                    disabled={resolving}
                    className="btn btn-primary"
                  >
                    {resolving ? 'Processing...' : 'Approve Credit'}
                  </button>
                  <button
                    onClick={() => handleResolve('REJECTED')}
                    disabled={resolving}
                    className="btn btn-danger"
                  >
                    Reject
                  </button>
                  <button onClick={() => setSelectedRequest(null)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor:
                    selectedRequest.status === 'APPROVED'
                      ? 'rgba(127, 176, 105, 0.15)'
                      : 'rgba(220, 53, 69, 0.1)',
                  borderRadius: '8px',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>
                  {selectedRequest.status === 'APPROVED'
                    ? `Approved: £${selectedRequest.creditAmount?.toFixed(2)} credit`
                    : 'Rejected'}
                </p>
                {selectedRequest.resolutionNote && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    {selectedRequest.resolutionNote}
                  </p>
                )}
                {selectedRequest.resolvedAt && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    Resolved on {new Date(selectedRequest.resolvedAt).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '2rem',
          }}
          onClick={() => setViewingPhoto(null)}
        >
          <img
            src={viewingPhoto}
            alt="Damage photo"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
          <button
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'white',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
