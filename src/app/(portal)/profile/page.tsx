'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface RetailerProfile {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  phone: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.retailer);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setMessage('Profile updated successfully!');
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setMessage('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof RetailerProfile, value: string) {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile) {
    return <div>Failed to load profile</div>;
  }

  const isAddressComplete = profile.addressLine1 && profile.city && profile.postcode;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="page-title">Store Profile</h1>

      {!isAddressComplete && (
        <div className="card" style={{ backgroundColor: '#fef3c7', marginBottom: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ margin: 0, color: '#92400e' }}>
            <strong>Address required:</strong> Please complete your store address to place orders.
          </p>
        </div>
      )}

      {message && (
        <div className="card" style={{
          backgroundColor: message.includes('success') ? '#d1fae5' : '#fee2e2',
          marginBottom: '1rem'
        }}>
          <p style={{ margin: 0, color: message.includes('success') ? '#065f46' : '#991b1b' }}>
            {message}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Store Details</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Store Name
          </label>
          <input
            type="text"
            className="input"
            value={profile.name}
            disabled
            style={{ backgroundColor: '#f3f4f6' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Store Code
          </label>
          <input
            type="text"
            className="input"
            value={profile.code}
            disabled
            style={{ backgroundColor: '#f3f4f6' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Contact Email
          </label>
          <input
            type="email"
            className="input"
            value={profile.contactEmail}
            onChange={(e) => updateField('contactEmail', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Phone
          </label>
          <input
            type="tel"
            className="input"
            value={profile.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="e.g., 020 1234 5678"
          />
        </div>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', marginTop: '1.5rem' }}>
          Delivery Address <span style={{ color: '#dc2626' }}>*</span>
        </h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Address Line 1 <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            className="input"
            value={profile.addressLine1 || ''}
            onChange={(e) => updateField('addressLine1', e.target.value)}
            placeholder="Street address"
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Address Line 2
          </label>
          <input
            type="text"
            className="input"
            value={profile.addressLine2 || ''}
            onChange={(e) => updateField('addressLine2', e.target.value)}
            placeholder="Building, floor, etc. (optional)"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            Address Line 3
          </label>
          <input
            type="text"
            className="input"
            value={profile.addressLine3 || ''}
            onChange={(e) => updateField('addressLine3', e.target.value)}
            placeholder="Area (optional)"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              City/Town <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              value={profile.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              County
            </label>
            <input
              type="text"
              className="input"
              value={profile.county || ''}
              onChange={(e) => updateField('county', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Postcode <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              className="input"
              value={profile.postcode || ''}
              onChange={(e) => updateField('postcode', e.target.value.toUpperCase())}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Country
            </label>
            <input
              type="text"
              className="input"
              value={profile.country || 'United Kingdom'}
              onChange={(e) => updateField('country', e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
