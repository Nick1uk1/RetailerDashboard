'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SKU {
  id: string;
  skuCode: string;
  name: string;
  basePrice: number;
  packSize: number;
  imageUrl: string | null;
}

interface ProductRange {
  id: string;
  name: string;
  description: string | null;
  skus: SKU[];
}

interface Retailer {
  id: string;
  name: string;
  code: string;
}

interface RetailerRange {
  id: string;
  name: string;
  description: string | null;
  totalSkus: number;
  assignedSkus: number;
  fullyAssigned: boolean;
  partiallyAssigned: boolean;
}

export default function SuperadminSKUsPage() {
  const [ranges, setRanges] = useState<ProductRange[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
  const [retailerRanges, setRetailerRanges] = useState<RetailerRange[]>([]);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRetailerId) {
      loadRetailerRanges(selectedRetailerId);
    } else {
      setRetailerRanges([]);
    }
  }, [selectedRetailerId]);

  async function loadData() {
    try {
      const [skusRes, retailersRes] = await Promise.all([
        fetch('/api/superadmin/skus'),
        fetch('/api/superadmin/retailers'),
      ]);

      const skusData = await skusRes.json();
      const retailersData = await retailersRes.json();

      if (skusRes.ok) {
        setRanges(skusData.ranges);
      }
      if (retailersRes.ok) {
        setRetailers(retailersData.retailers);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadRetailerRanges(retailerId: string) {
    setLoadingRanges(true);
    try {
      const res = await fetch(`/api/superadmin/retailers/${retailerId}/ranges`);
      const data = await res.json();
      if (res.ok) {
        setRetailerRanges(data.ranges);
      }
    } catch (err) {
      console.error('Failed to load retailer ranges:', err);
    } finally {
      setLoadingRanges(false);
    }
  }

  async function handlePriceUpdate(skuId: string, newPrice: number) {
    setUpdating(skuId);
    try {
      const res = await fetch(`/api/superadmin/skus/${skuId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice: newPrice }),
      });

      if (res.ok) {
        // Update local state
        setRanges(ranges.map(range => ({
          ...range,
          skus: range.skus.map(sku =>
            sku.id === skuId ? { ...sku, basePrice: newPrice } : sku
          ),
        })));
      }
    } catch (err) {
      console.error('Failed to update price:', err);
    } finally {
      setUpdating(null);
      setEditingPrice(null);
    }
  }

  async function handleRangeToggle(rangeId: string, currentlyAssigned: boolean) {
    if (!selectedRetailerId) return;

    setUpdating(rangeId);
    try {
      const res = await fetch(`/api/superadmin/retailers/${selectedRetailerId}/ranges`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rangeId,
          action: currentlyAssigned ? 'unassign' : 'assign',
        }),
      });

      if (res.ok) {
        loadRetailerRanges(selectedRetailerId);
      }
    } catch (err) {
      console.error('Failed to toggle range:', err);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return <div>Loading SKUs...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">SKU Management</h1>
        <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
          {ranges.reduce((sum, r) => sum + r.skus.length, 0)} products across {ranges.length} ranges
        </span>
      </div>

      {/* Range Assignment Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          Assign Ranges to Retailers
        </h2>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 300px' }}>
            <label className="label">Select Retailer</label>
            <select
              className="input"
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
            >
              <option value="">Choose a retailer...</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {selectedRetailerId && (
            <div style={{ flex: 1 }}>
              <label className="label">Product Ranges</label>
              {loadingRanges ? (
                <div style={{ padding: '1rem', color: 'var(--gray-500)' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {retailerRanges.map((range) => (
                    <div
                      key={range.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: range.fullyAssigned ? 'rgba(127, 176, 105, 0.15)' : 'var(--gray-100)',
                        borderRadius: '8px',
                        border: range.fullyAssigned ? '2px solid var(--sage)' : '2px solid transparent',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{range.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {range.assignedSkus} of {range.totalSkus} SKUs assigned
                        </div>
                      </div>
                      <button
                        onClick={() => handleRangeToggle(range.id, range.fullyAssigned)}
                        disabled={updating === range.id}
                        className={`btn btn-sm ${range.fullyAssigned ? 'btn-secondary' : 'btn-primary'}`}
                      >
                        {updating === range.id
                          ? '...'
                          : range.fullyAssigned
                          ? 'Remove'
                          : 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Ranges Display */}
      {ranges.map((range) => (
        <div key={range.id} style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--forest)',
            borderRadius: '8px',
            color: 'white',
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              {range.name}
            </h2>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
            }}>
              {range.skus.length} products
            </span>
            {range.description && (
              <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                {range.description}
              </span>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {range.skus.map((sku) => (
              <div
                key={sku.id}
                className="card"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem',
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--gray-100)',
                  flexShrink: 0,
                }}>
                  {sku.imageUrl ? (
                    <img
                      src={sku.imageUrl}
                      alt={sku.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      opacity: 0.3,
                    }}>
                      🍽️
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--gray-500)',
                    marginBottom: '0.25rem',
                  }}>
                    {sku.skuCode}
                  </div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {sku.name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--gray-500)',
                    marginTop: '0.25rem',
                  }}>
                    Case of {sku.packSize}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                  }}>
                    {editingPrice === sku.id ? (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          style={{
                            width: '80px',
                            padding: '0.25rem 0.5rem',
                            border: '1px solid var(--gray-300)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handlePriceUpdate(sku.id, parseFloat(priceInput))}
                          disabled={updating === sku.id}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--sage)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPrice(null)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--gray-200)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--forest)',
                        }}>
                          {sku.basePrice > 0 ? `£${(sku.basePrice * sku.packSize).toFixed(2)}/case` : 'No price set'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPrice(sku.id);
                            setPriceInput(sku.basePrice.toFixed(2));
                          }}
                          style={{
                            padding: '0.125rem 0.375rem',
                            fontSize: '0.625rem',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--gray-300)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--gray-500)',
                          }}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
