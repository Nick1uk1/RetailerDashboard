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
  deliveredAt: string | null;
  lines: OrderLine[];
  linnworksMap: { pkOrderId: string } | null;
  events: OrderEvent[];
  retailer?: {
    name: string;
    code: string;
  };
}

interface AffectedItem {
  skuCode: string;
  skuName: string;
  units: number;
}

interface CreditRequest {
  id: string;
  description: string;
  affectedItems: AffectedItem[];
  photoUrls: string[];
  status: string;
  creditAmount: number | null;
  createdAt: string;
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
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [submittingCredit, setSubmittingCredit] = useState(false);
  const [creditDescription, setCreditDescription] = useState('');
  const [affectedItems, setAffectedItems] = useState<AffectedItem[]>([]);
  const [photoFiles, setPhotoFiles] = useState<string[]>([]);

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
    loadCreditRequests();
  }, [params.id]);

  async function loadCreditRequests() {
    try {
      const res = await fetch(`/api/orders/${params.id}/credit-request`);
      const data = await res.json();
      if (res.ok) {
        setCreditRequests(data.creditRequests || []);
      }
    } catch (err) {
      console.error('Failed to load credit requests');
    }
  }

  function canRequestCredit(): boolean {
    if (!order || order.status !== 'DELIVERED') return false;
    if (!order.deliveredAt) return true; // Allow if delivered but no timestamp
    const hoursSinceDelivery = (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceDelivery <= 48;
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoFiles(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  function addAffectedItem() {
    if (!order) return;
    setAffectedItems(prev => [...prev, { skuCode: '', skuName: '', units: 1 }]);
  }

  function updateAffectedItem(index: number, field: keyof AffectedItem, value: string | number) {
    setAffectedItems(prev => {
      const updated = [...prev];
      if (field === 'skuCode' && order) {
        const line = order.lines.find(l => l.skuCode === value);
        if (line) {
          updated[index] = { ...updated[index], skuCode: line.skuCode, skuName: line.skuName };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }

  function removeAffectedItem(index: number) {
    setAffectedItems(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitCreditRequest() {
    if (!creditDescription.trim()) {
      alert('Please describe the issue');
      return;
    }
    if (affectedItems.length === 0) {
      alert('Please add at least one affected item');
      return;
    }
    if (photoFiles.length === 0) {
      alert('Please upload at least one photo');
      return;
    }

    setSubmittingCredit(true);
    try {
      const res = await fetch(`/api/orders/${params.id}/credit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: creditDescription,
          affectedItems,
          photoUrls: photoFiles,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreditForm(false);
        setCreditDescription('');
        setAffectedItems([]);
        setPhotoFiles([]);
        loadCreditRequests();
      } else {
        alert(data.error || 'Failed to submit credit request');
      }
    } catch (err) {
      alert('Something went wrong');
    } finally {
      setSubmittingCredit(false);
    }
  }

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

      {/* Credit Request Section */}
      {order.status === 'DELIVERED' && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--forest)', margin: 0 }}>
              Credit Requests
            </h2>
            {canRequestCredit() && creditRequests.filter(cr => cr.status === 'PENDING').length === 0 && (
              <button
                onClick={() => setShowCreditForm(true)}
                className="btn btn-secondary btn-sm"
              >
                Request Credit
              </button>
            )}
          </div>

          {!canRequestCredit() && creditRequests.length === 0 && (
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', margin: 0 }}>
              Credit requests must be submitted within 48 hours of delivery.
            </p>
          )}

          {creditRequests.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {creditRequests.map(cr => (
                <div
                  key={cr.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: cr.status === 'PENDING' ? 'rgba(212, 168, 84, 0.1)' : cr.status === 'APPROVED' ? 'rgba(127, 176, 105, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${cr.status === 'PENDING' ? '#D4A854' : cr.status === 'APPROVED' ? 'var(--sage)' : 'var(--danger)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className={`badge ${cr.status === 'PENDING' ? 'badge-warning' : cr.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}>
                      {cr.status}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {new Date(cr.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem' }}>{cr.description}</p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                    {cr.affectedItems.reduce((sum, item) => sum + item.units, 0)} units affected across {cr.affectedItems.length} SKU(s)
                  </div>
                  {cr.status === 'APPROVED' && cr.creditAmount && (
                    <div style={{ marginTop: '0.5rem', fontWeight: 600, color: 'var(--sage)' }}>
                      Credit approved: £{cr.creditAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Credit Request Form Modal */}
      {showCreditForm && (
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
          onClick={() => setShowCreditForm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: 'var(--forest)', marginBottom: '0.5rem' }}>Request Credit</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Report damaged or missing items. Please upload photos as evidence.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Describe the Issue *</label>
              <textarea
                className="input"
                value={creditDescription}
                onChange={(e) => setCreditDescription(e.target.value)}
                rows={3}
                placeholder="Describe what was damaged or missing..."
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Affected Items *</label>
              {affectedItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <select
                    className="input"
                    value={item.skuCode}
                    onChange={(e) => updateAffectedItem(idx, 'skuCode', e.target.value)}
                    style={{ flex: 2 }}
                  >
                    <option value="">Select SKU...</option>
                    {order?.lines.map(line => (
                      <option key={line.skuCode} value={line.skuCode}>
                        {line.skuCode} - {line.skuName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input"
                    value={item.units}
                    onChange={(e) => updateAffectedItem(idx, 'units', parseInt(e.target.value) || 0)}
                    min={1}
                    placeholder="Units"
                    style={{ width: '100px' }}
                  />
                  <button
                    onClick={() => removeAffectedItem(idx)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0 0.75rem' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button onClick={addAffectedItem} className="btn btn-secondary btn-sm">
                + Add Item
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Upload Photos * (required)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ marginBottom: '0.5rem' }}
              />
              {photoFiles.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {photoFiles.map((photo, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={photo}
                        alt={`Upload ${idx + 1}`}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <button
                        onClick={() => setPhotoFiles(prev => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--danger)',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleSubmitCreditRequest}
                disabled={submittingCredit}
                className="btn btn-primary"
              >
                {submittingCredit ? 'Submitting...' : 'Submit Request'}
              </button>
              <button onClick={() => setShowCreditForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
