import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSubmission, deleteSubmission, getRounds } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSIONS } from '../../config/permissions';
import ConfirmModal from '../../components/ConfirmModal';
import { RoundTimeline, StatusBadge, AuthenticatedImage } from '../../components/RoundTimeline';

export default function SubmissionDetail() {
  const { uuid }          = useParams();
  const navigate          = useNavigate();
  const location          = useLocation();
  const scheduleTitle     = location.state?.scheduleTitle ?? null;

  const { isGlobalAdmin, role, userId } = useAuth();
  const { hasPermission }       = usePermissions();

  const canDelete   = isGlobalAdmin || role === 'local_admin';
  const isInspector = ['inspector', 'global_admin', 'local_admin'].includes(role);

  const [data,        setData]        = useState(null);
  const [rounds,      setRounds]      = useState(null);
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
  const overallStatus  = submission.overall_status || submission.status || 'pending';
  const roundsList     = rounds?.rounds      ?? [];
  const currentRound   = rounds?.current_round ?? 1;
  const displayTitle   = submission.schedule_title ?? scheduleTitle;

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
          <div>
            <h1>{submission.category_name} Inspection</h1>
            {displayTitle && (
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', color: 'var(--muted)', fontWeight: 500 }}>
                {displayTitle}
              </p>
            )}
          </div>
          {canDelete && overallStatus !== 'closed' && (
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
            Round {currentRound}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        {overallStatus === 'rejected' && (String(submission.attendee_id) === String(userId) || role === 'attendee') && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/submissions/${uuid}/review`)}
          >
            📝 Review &amp; Add Remarks
          </button>
        )}

        {overallStatus === 'under_review' && (String(submission.assigned_to) === String(userId) || isInspector) && (
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
          background: overallStatus === 'approved' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${overallStatus === 'approved' ? '#86efac' : '#fca5a5'}`,
        }}>
          <p style={{ margin: 0, fontWeight: 600,
            color: overallStatus === 'approved' ? '#166534' : '#991b1b' }}>
            {overallStatus === 'approved' ? '✓ Approved' : '✗ Rejected'}
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
          {overallStatus === 'rejected' && submission.review_deadline && (() => {
            const deadlinePassed = Date.now() > new Date(submission.review_deadline).getTime();
            return (
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>Attendee review deadline:</span>
                <strong style={{ color: deadlinePassed ? '#dc2626' : '#991b1b' }}>
                  {new Date(submission.review_deadline).toLocaleString()}
                </strong>
                {deadlinePassed && (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, color: '#dc2626',
                    background: '#fef2f2', border: '1px solid #fca5a5',
                    borderRadius: 4, padding: '1px 6px',
                  }}>
                    Deadline passed
                  </span>
                )}
              </p>
            );
          })()}
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
                <AuthenticatedImage
                  id={img.id}
                  alt={img.original_name}
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: 8 }}
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
