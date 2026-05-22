import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthenticatedImage({ id, alt, ...props }) {
  const { token } = useAuth();
  const [src, setSrc]     = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || !token) return;
    const base = import.meta.env.VITE_API_BASE_URL;
    let objectUrl;
    let cancelled = false;

    fetch(`${base}/submissions/image/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`Image load failed: ${r.status} ${r.statusText} — ${text}`);
        }
        return r.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(err => {
        if (cancelled) return;
        console.error(`AuthenticatedImage [id=${id}]:`, err.message);
        setError(err.message);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, token]);

  if (error) return <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</span>;
  if (!src)  return <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Loading…</span>;
  return <img src={src} alt={alt} {...props} />;
}

export function StatusBadge({ status }) {
  const map = {
    pending:      { bg: '#fefce8', color: '#854d0e', border: '#fde047', label: '⏳ Pending'      },
    submitted:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: '📋 Submitted'    },
    approved:     { bg: '#f0fdf4', color: '#166534', border: '#86efac', label: '✓ Approved'      },
    rejected:     { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5', label: '✗ Rejected'      },
    under_review: { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff', label: '🔍 Under Review' },
    closed:       { bg: '#f8fafc', color: '#475569', border: '#cbd5e1', label: '🔒 Closed'       },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '0.25rem 0.75rem', borderRadius: '999px',
      fontSize: '0.85rem', fontWeight: 600, display: 'inline-block',
    }}>
      {s.label}
    </span>
  );
}

export function RoundTimeline({ rounds, labelMap }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h2>Inspection History</h2>
      {rounds.map(r => (
        <div key={r.id} style={{
          border: '1px solid #e2e8f0', borderRadius: 10,
          marginBottom: '1rem', overflow: 'hidden',
        }}>
          <div
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.85rem 1.25rem', cursor: 'pointer',
              background: expanded === r.id ? '#f8fafc' : '#fff',
              borderBottom: expanded === r.id ? '1px solid #e2e8f0' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: r.status === 'approved' ? '#16a34a'
                          : r.status === 'rejected'  ? '#dc2626' : '#3b82f6',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
              }}>
                {r.round_number}
              </span>
              <div>
                <span style={{ fontWeight: 600 }}>
                  {r.round_number === 1 ? 'Initial Inspection' : `Re-inspection #${r.round_number - 1}`}
                </span>
                {r.inspector_username && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                    by {r.inspector_username}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusBadge status={r.status} />
              {r.submitted_at && (
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {new Date(r.submitted_at).toLocaleString()}
                </span>
              )}
              <span style={{ color: '#94a3b8' }}>{expanded === r.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expanded === r.id && (
            <div style={{ padding: '1.25rem' }}>
              {r.answers && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>
                    Answers
                  </h4>
                  <dl style={{ margin: 0 }}>
                    {Object.entries(r.answers).map(([qId, val]) => (
                      <div key={qId} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '0.5rem', padding: '0.4rem 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}>
                        <dt style={{ fontWeight: 500, fontSize: '0.875rem', color: '#334155' }}>
                          {labelMap?.[qId] || `Question #${qId}`}
                        </dt>
                        <dd style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>{val}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {r.status !== 'pending' && r.status !== 'submitted' && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
                  background: r.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${r.status === 'approved' ? '#86efac' : '#fca5a5'}`,
                }}>
                  <p style={{ margin: 0, fontWeight: 600,
                    color: r.status === 'approved' ? '#166534' : '#991b1b' }}>
                    {r.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                    {r.reviewed_by_username && ` by ${r.reviewed_by_username}`}
                    {r.reviewed_at && (
                      <span style={{ fontWeight: 400, fontSize: '0.8rem', marginLeft: '0.5rem', color: '#64748b' }}>
                        on {new Date(r.reviewed_at).toLocaleString()}
                      </span>
                    )}
                  </p>
                  {r.review_notes && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: '#475569' }}>
                      {r.review_notes}
                    </p>
                  )}
                  {r.status === 'rejected' && (() => {
                    const dl = r.attendee_review_deadline ?? r.review_deadline ?? null;
                    if (!dl) return null;
                    const deadlinePassed = Date.now() > new Date(dl).getTime();
                    return (
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Attendee review deadline:</span>
                        <strong style={{ color: deadlinePassed ? '#dc2626' : '#991b1b' }}>
                          {new Date(dl).toLocaleString()}
                        </strong>
                        {deadlinePassed && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 700, color: '#dc2626',
                            background: '#fef2f2', border: '1px solid #fca5a5',
                            borderRadius: 4, padding: '1px 5px',
                          }}>
                            Deadline passed
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>
              )}

              {r.attendee_remarks?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#7e22ce', textTransform: 'uppercase' }}>
                    Attendee Remarks
                  </h4>
                  {r.attendee_remarks.map(ar => (
                    <div key={ar.question_id} style={{
                      padding: '0.6rem 0.85rem', marginBottom: '0.4rem',
                      background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 7,
                    }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#581c87' }}>
                        {ar.question}
                      </p>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6b21a8' }}>
                        {ar.remark}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {r.inspector_images?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>
                    Inspector Images ({r.inspector_images.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {r.inspector_images.map(img => (
                      <div key={img.id} style={{ flex: '0 0 auto' }}>
                        <AuthenticatedImage
                          id={img.id}
                          alt={img.original_name || `Inspector image ${img.id}`}
                          style={{ width: '160px', height: '120px', objectFit: 'cover', borderRadius: 6 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {r.attendee_images?.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#7e22ce', textTransform: 'uppercase' }}>
                    Attendee Images ({r.attendee_images.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {r.attendee_images.map(img => (
                      <div key={img.id} style={{ flex: '0 0 auto' }}>
                        <AuthenticatedImage
                          id={img.id}
                          alt={img.original_name || `Attendee image ${img.id}`}
                          style={{ width: '160px', height: '120px', objectFit: 'cover', borderRadius: 6 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}