'use client';

import { useEffect, useState } from 'react';

interface Retailer {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  paymentTermsDays: number;
  casePrice: number | null;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  active: boolean;
  users: {
    id: string;
    email: string;
    name: string;
    role: string;
    active: boolean;
  }[];
  _count: {
    orders: number;
  };
}

interface ProductRange {
  id: string;
  name: string;
  description: string | null;
  totalSkus: number;
  assignedSkus: number;
  fullyAssigned: boolean;
}


interface FormData {
  name: string;
  code: string;
  contactEmail: string;
  paymentTermsDays: number;
  casePrice: string;
  addressLine1: string;
  city: string;
  postcode: string;
  phone: string;
}

const emptyForm: FormData = {
  name: '',
  code: '',
  contactEmail: '',
  paymentTermsDays: 14,
  casePrice: '',
  addressLine1: '',
  city: '',
  postcode: '',
  phone: '',
};

export default function SuperadminRetailersPage() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [productRanges, setProductRanges] = useState<ProductRange[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [togglingRange, setTogglingRange] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter retailers based on search term
  const filteredRetailers = retailers.filter((retailer) => {
    const search = searchTerm.toLowerCase();
    return (
      retailer.name.toLowerCase().includes(search) ||
      retailer.code.toLowerCase().includes(search) ||
      retailer.contactEmail.toLowerCase().includes(search) ||
      (retailer.city && retailer.city.toLowerCase().includes(search)) ||
      (retailer.postcode && retailer.postcode.toLowerCase().includes(search))
    );
  });

  async function loadRetailers() {
    try {
      const res = await fetch('/api/superadmin/retailers');
      const data = await res.json();

      if (res.ok) {
        setRetailers(data.retailers);
      } else {
        setError(data.error || 'Failed to load retailers');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRetailers();
  }, []);

  async function loadRetailerRanges(retailerId: string) {
    setLoadingRanges(true);
    try {
      const res = await fetch(`/api/superadmin/retailers/${retailerId}/ranges`);
      const data = await res.json();
      if (res.ok) {
        setProductRanges(data.ranges);
      }
    } catch (err) {
      console.error('Failed to load retailer ranges:', err);
    } finally {
      setLoadingRanges(false);
    }
  }

  async function handleRangeToggle(rangeId: string, currentlyAssigned: boolean) {
    if (!editingId) return;
    setTogglingRange(rangeId);
    try {
      const res = await fetch(`/api/superadmin/retailers/${editingId}/ranges`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeId,
          action: currentlyAssigned ? 'unassign' : 'assign',
        }),
      });
      if (res.ok) {
        loadRetailerRanges(editingId);
      }
    } catch (err) {
      console.error('Failed to toggle range:', err);
    } finally {
      setTogglingRange(null);
    }
  }

  function handleEdit(retailer: Retailer) {
    setEditingId(retailer.id);
    setFormData({
      name: retailer.name,
      code: retailer.code,
      contactEmail: retailer.contactEmail,
      paymentTermsDays: retailer.paymentTermsDays,
      casePrice: retailer.casePrice ? String(retailer.casePrice) : '',
      addressLine1: retailer.addressLine1 || '',
      city: retailer.city || '',
      postcode: retailer.postcode || '',
      phone: retailer.phone || '',
    });
    setShowForm(true);
    loadRetailerRanges(retailer.id);
  }

  function handleNew() {
    setEditingId(null);
    setFormData(emptyForm);
    setProductRanges([]);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setProductRanges([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingId
        ? `/api/superadmin/retailers/${editingId}`
        : '/api/superadmin/retailers';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: editingId ? 'Retailer updated' : 'Retailer created', type: 'success' });
        setShowForm(false);
        setEditingId(null);
        setFormData(emptyForm);
        loadRetailers();
      } else {
        setMessage({ text: data.error || 'Failed to save', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Something went wrong', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(retailer: Retailer) {
    try {
      const res = await fetch(`/api/superadmin/retailers/${retailer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !retailer.active }),
      });

      if (res.ok) {
        loadRetailers();
      }
    } catch (err) {
      console.error('Failed to toggle active status');
    }
  }

  if (loading) {
    return <div>Loading retailers...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Retailers</h1>
        <button onClick={handleNew} className="btn btn-primary">
          + Add Retailer
        </button>
      </div>

      {message && (
        <div
          className="card"
          style={{
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            marginBottom: '1rem',
          }}
        >
          <p style={{ color: message.type === 'success' ? '#166534' : '#991b1b' }}>
            {message.text}
          </p>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1.25rem', color: 'var(--forest)', fontWeight: 700 }}>{editingId ? 'Edit Retailer' : 'New Retailer'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Code *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>
              <div>
                <label className="label">Contact Email *</label>
                <input
                  type="email"
                  className="input"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Payment Terms (days)</label>
                <select
                  className="input"
                  value={formData.paymentTermsDays}
                  onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) })}
                >
                  <option value={7}>Net 7</option>
                  <option value={14}>Net 14</option>
                  <option value={30}>Net 30</option>
                  <option value={45}>Net 45</option>
                  <option value={60}>Net 60</option>
                  <option value={90}>Net 90</option>
                </select>
              </div>
              <div>
                <label className="label">Case Price (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.casePrice}
                  onChange={(e) => setFormData({ ...formData, casePrice: e.target.value })}
                  placeholder="e.g. 23.40"
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  className="input"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                />
              </div>
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  className="input"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Postcode</label>
                <input
                  type="text"
                  className="input"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="text"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Product Ranges - only show when editing */}
            {editingId && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
                <label className="label" style={{ marginBottom: '0.75rem', display: 'block' }}>
                  Product Ranges
                </label>
                {loadingRanges ? (
                  <div style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>Loading ranges...</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {productRanges.map((range) => (
                      <div
                        key={range.id}
                        onClick={() => handleRangeToggle(range.id, range.fullyAssigned)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          cursor: togglingRange === range.id ? 'wait' : 'pointer',
                          backgroundColor: range.fullyAssigned ? 'var(--sage)' : 'var(--gray-100)',
                          color: range.fullyAssigned ? 'white' : 'var(--gray-700)',
                          border: range.fullyAssigned ? '2px solid var(--sage)' : '2px solid var(--gray-200)',
                          transition: 'all 0.2s',
                          opacity: togglingRange === range.id ? 0.6 : 1,
                        }}
                      >
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          backgroundColor: range.fullyAssigned ? 'white' : 'transparent',
                          border: range.fullyAssigned ? 'none' : '2px solid var(--gray-400)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          color: 'var(--sage)',
                          fontWeight: 700,
                        }}>
                          {range.fullyAssigned && '✓'}
                        </span>
                        <span style={{ fontWeight: 500 }}>{range.name}</span>
                        <span style={{
                          fontSize: '0.75rem',
                          opacity: 0.7,
                        }}>
                          ({range.totalSkus} SKUs)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={handleCancel} className="btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {/* Search Box */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            className="input"
            placeholder="Search retailers by name, code, email, city, or postcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '400px' }}
          />
          {searchTerm && (
            <span style={{ marginLeft: '1rem', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
              Showing {filteredRetailers.length} of {retailers.length} retailers
            </span>
          )}
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Contact</th>
              <th>Case Price</th>
              <th>Payment Terms</th>
              <th>Users</th>
              <th>Orders</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRetailers.map((retailer) => (
              <tr key={retailer.id} style={{ opacity: retailer.active ? 1 : 0.5 }}>
                <td>
                  <div style={{ fontWeight: 500 }}>{retailer.name}</div>
                  {retailer.city && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {retailer.city}
                    </div>
                  )}
                </td>
                <td style={{ fontFamily: 'monospace' }}>{retailer.code}</td>
                <td>{retailer.contactEmail}</td>
                <td style={{ fontWeight: 600 }}>
                  {retailer.casePrice ? `£${Number(retailer.casePrice).toFixed(2)}` : <span style={{ color: 'var(--gray-400)' }}>-</span>}
                </td>
                <td>Net {retailer.paymentTermsDays}</td>
                <td>{retailer.users.length}</td>
                <td>{retailer._count.orders}</td>
                <td>
                  <span className={`badge ${retailer.active ? 'badge-success' : 'badge-danger'}`}>
                    {retailer.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(retailer)} className="btn btn-primary btn-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(retailer)}
                      className={`btn btn-sm ${retailer.active ? 'btn-danger' : 'btn-secondary'}`}
                    >
                      {retailer.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
