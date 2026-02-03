'use client';

import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  retailer: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Retailer {
  id: string;
  name: string;
  code: string;
}

interface FormData {
  email: string;
  name: string;
  role: string;
  retailerId: string;
}

const emptyForm: FormData = {
  email: '',
  name: '',
  role: 'BUYER',
  retailerId: '',
};

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [filterRetailer, setFilterRetailer] = useState<string>('');

  async function loadData() {
    try {
      const [usersRes, retailersRes] = await Promise.all([
        fetch('/api/superadmin/users'),
        fetch('/api/superadmin/retailers'),
      ]);

      const usersData = await usersRes.json();
      const retailersData = await retailersRes.json();

      if (usersRes.ok) {
        setUsers(usersData.users);
      } else {
        setError(usersData.error || 'Failed to load users');
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

  function handleEdit(user: User) {
    setEditingId(user.id);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      retailerId: user.retailer?.id || '',
    });
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingId
        ? `/api/superadmin/users/${editingId}`
        : '/api/superadmin/users';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: editingId ? 'User updated' : 'User created', type: 'success' });
        setShowForm(false);
        setEditingId(null);
        setFormData(emptyForm);
        loadData();
      } else {
        setMessage({ text: data.error || 'Failed to save', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Something went wrong', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const res = await fetch(`/api/superadmin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Failed to toggle active status');
    }
  }

  const filteredUsers = filterRetailer
    ? users.filter((u) => u.retailer?.id === filterRetailer)
    : users;

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="page-title">Manage Users</h1>
        <button onClick={handleNew} className="btn btn-primary">
          Add User
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
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>{editingId ? 'Edit User' : 'New User'}</h2>
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
                <label className="label">Email *</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Role *</label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="BUYER">Buyer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPERADMIN">Superadmin</option>
                </select>
              </div>
              {formData.role !== 'SUPERADMIN' && (
                <div>
                  <label className="label">Retailer *</label>
                  <select
                    className="input"
                    value={formData.retailerId}
                    onChange={(e) => setFormData({ ...formData, retailerId: e.target.value })}
                    required={formData.role !== 'SUPERADMIN'}
                  >
                    <option value="">Select retailer...</option>
                    {retailers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
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
        <div style={{ marginBottom: '1rem' }}>
          <label className="label">Filter by Retailer</label>
          <select
            className="input"
            style={{ width: '300px' }}
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

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Retailer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} style={{ opacity: user.active ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span
                    className={`badge ${
                      user.role === 'SUPERADMIN'
                        ? 'badge-warning'
                        : user.role === 'ADMIN'
                        ? 'badge-info'
                        : 'badge-success'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.retailer ? (
                    <>
                      <div>{user.retailer.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        {user.retailer.code}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: 'var(--gray-400)' }}>-</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(user)} className="btn btn-primary">
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={user.active ? 'btn btn-danger' : 'btn btn-primary'}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
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
