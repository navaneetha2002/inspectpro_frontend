import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubmission, deleteSubmission, getRounds } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSIONS } from '../../config/permissions';
import ConfirmModal from '../../components/ConfirmModal';

function StatusBadge({ status }) {
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

function RoundTimeline({ rounds, labelMap }) {
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

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                {r.inspector_images?.length > 0 && (
                  <span>📷 {r.inspector_images.length} inspector image{r.inspector_images.length !== 1 ? 's' : ''}</span>
                )}
                {r.attendee_images?.length > 0 && (
                  <span>🖼 {r.attendee_images.length} attendee image{r.attendee_images.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SubmissionDetail() {
  const { uuid }          = useParams();
  const navigate          = useNavigate();

  // ✅ Pull role so isInspector works
  const { isGlobalAdmin, role } = useAuth();
  const { hasPermission }       = usePermissions();

  const canDelete   = isGlobalAdmin || hasPermission(PERMISSIONS.VIEW_SUBMISSIONS);
  // ✅ Declare isInspector
  const isInspector = ['inspector', 'global_admin', 'local_admin'].includes(role);

  const [data,        setData]        = useState(null);
  const [rounds,      setRounds]      = useState(null);   // ✅ declare rounds state
  const [deleting,    setDeleting]    = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getSubmission(uuid).then(r => setData(r.data));
    getRounds(uuid)
      .then(r => setRounds(r.data))
      .catch(err => console.warn('Rounds not available:', err.response?.status));
  }, [uuid]);

  if (!data) return <p>Loading…</p>;

  const { submission, images, labelMap } = data;
  const overallStatus = submission.overall_status || submission.status || 'pending';
  // Safe derived values — rounds may still be null while loading
  const roundsList    = rounds?.rounds      ?? [];
  const currentRound  = rounds?.current_round ?? 1;
  const maxRounds     = rounds?.max_rounds    ?? 3;

  console.log('overallStatus:', overallStatus);
  console.log('submission.overall_status:', submission.overall_status);
  console.log('submission.status:', submission.status);
  console.log('currentRound:', currentRound, 'maxRounds:', maxRounds);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSubmission(uuid);
      navigate('/submissions');
    } catch {
      alert('Failed to delete submission.');
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div>
      <div className="sticky-header">
        <nav className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate('/submissions')}>Submissions</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{submission.category_name} Inspection</span>
        </nav>
        <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <h1>{submission.category_name} Inspection</h1>
          {canDelete && (
            <button onClick={() => setConfirmOpen(true)} className="btn btn-danger" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Submission'}
            </button>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="detail-meta" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
        <StatusBadge status={overallStatus} />
        {rounds && (
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Round {currentRound} of {maxRounds}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        {overallStatus === 'rejected' && currentRound < maxRounds && role !== 'inspector' && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/submissions/${uuid}/review`)}
          >
            📝 Review &amp; Add Remarks
          </button>
        )}

        {overallStatus === 'under_review' && isInspector && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/submissions/${uuid}/reinspect`)}
          >
            🔄 Start Re-inspection
          </button>
        )}
      </div>

      {/* Latest decision banner */}
      {submission.status !== 'pending' && submission.status !== 'submitted' && overallStatus !== 'under_review' && (
        <div style={{
          margin: '1rem 0', padding: '1rem 1.25rem', borderRadius: 10,
          background: overallStatus === 'approved' ? '#f0fdf4'
                    : overallStatus === 'closed'   ? '#f8fafc' : '#fef2f2',
          border: `1px solid ${
            overallStatus === 'approved' ? '#86efac'
            : overallStatus === 'closed' ? '#cbd5e1' : '#fca5a5'
          }`,
        }}>
          <p style={{ margin: 0, fontWeight: 600,
            color: overallStatus === 'approved' ? '#166534'
                 : overallStatus === 'closed'   ? '#475569' : '#991b1b' }}>
            {overallStatus === 'approved' ? '✓ Approved'
           : overallStatus === 'closed'   ? '🔒 Closed — max re-inspections reached'
           : '✗ Rejected'}
            {submission.reviewed_by_username && ` by ${submission.reviewed_by_username}`}
            {submission.reviewed_at && (
              <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                on {new Date(submission.reviewed_at).toLocaleString()}
              </span>
            )}
          </p>
          {submission.review_notes && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: '#475569' }}>
              {submission.review_notes}
            </p>
          )}
        </div>
      )}

      {/* Answers */}
      <div className="detail-section">
        <h2>Answers</h2>
        <dl className="answers-list">
          {Object.entries(submission.answers).map(([key, value]) => (
            <div key={key} className="answer-row">
              <dt>{labelMap[key] || `Question #${key}`}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="detail-section">
          <h2>Images</h2>
          <div className="image-gallery">
            {images.map(img => (
              <div key={img.id} className="gallery-item">
                <img
                  src={`https://inspectpro-backend.cfapps.eu10-004.hana.ondemand.com/api/form/image/${img.id}`}
                  alt={img.original_name}
                />
                <span>{img.original_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round history */}
      {roundsList.length > 0 && (
        <div className="detail-section">
          <RoundTimeline rounds={roundsList} labelMap={labelMap} />
        </div>
      )}

      {confirmOpen && (
        <ConfirmModal
          title="Delete submission"
          message="Delete this submission? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}