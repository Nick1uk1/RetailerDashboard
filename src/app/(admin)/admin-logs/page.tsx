'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  id: string;
  orderId: string;
  eventType: string;
  payloadJson: string | null;
  createdAt: string;
  order: {
    externalRef: string;
    retailer: {
      name: string;
      code: string;
    };
  };
}

const eventTypeBadgeClass: Record<string, string> = {
  ORDER_CREATED: 'badge-info',
  LINNWORKS_REQUEST: 'badge-info',
  LINNWORKS_SUCCESS: 'badge-success',
  LINNWORKS_FAILURE: 'badge-danger',
  RETRY_ATTEMPT: 'badge-warning',
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const url = filter
          ? `/api/admin/logs?eventType=${filter}`
          : '/api/admin/logs';
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok) {
          setLogs(data.logs);
        } else {
          setError(data.error || 'Failed to load logs');
        }
      } catch (err) {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [filter]);

  if (loading) {
    return <div>Loading logs...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--danger)' }}>{error}</div>;
  }

  const eventTypes = ['', 'ORDER_CREATED', 'LINNWORKS_REQUEST', 'LINNWORKS_SUCCESS', 'LINNWORKS_FAILURE', 'RETRY_ATTEMPT'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Admin: Event Logs</h1>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
          >
            <option value="">All Events</option>
            {eventTypes.slice(1).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Event Type</th>
              <th>Order Ref</th>
              <th>Retailer</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <>
                <tr key={log.id}>
                  <td style={{ fontSize: '0.875rem' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${eventTypeBadgeClass[log.eventType] || 'badge-info'}`}>
                      {log.eventType}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {log.order.externalRef}
                  </td>
                  <td>
                    <div>{log.order.retailer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {log.order.retailer.code}
                    </div>
                  </td>
                  <td>
                    {log.payloadJson && (
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        {expandedLog === log.id ? 'Hide' : 'View'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedLog === log.id && log.payloadJson && (
                  <tr key={`${log.id}-payload`}>
                    <td colSpan={5} style={{ backgroundColor: 'var(--gray-50)' }}>
                      <pre style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        margin: 0,
                      }}>
                        {JSON.stringify(JSON.parse(log.payloadJson), null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            No logs found
          </p>
        )}
      </div>
    </div>
  );
}
