import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSubmission, deleteSubmission, getRounds } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSIONS } from '../../config/permissions';
import ConfirmModal from '../../components/ConfirmModal';
import { RoundTimeline, StatusBadge, AuthenticatedImage } from '../../components/RoundTimeline';

export default function SubmissionDetail() {
  const { uuid }      = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const scheduleTitle = location.state?.scheduleTitle ?? null;

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
  const overallStatus = submission.overall_status || submission.status || 'pending';
  const roundsList    = rounds?.rounds      ?? [];
  const currentRound  = rounds?.current_round ?? 1;
  const displayTitle  = submission.schedule_title ?? scheduleTitle;

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
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item" role="button" onClick={() => navigate('/submissions')}>
              Submissions
            </li>
            <li className="breadcrumb-item active">{submission.category_name} Inspection</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <div>
            <h1 className="h4 fw-bold mb-0">{submission.category_name} Inspection</h1>
            {displayTitle && (
              <p className="text-muted small mb-0 mt-1">{displayTitle}</p>
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
      <div className="d-flex align-items-center gap-3 flex-wrap text-muted small mb-3">
        <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
        <StatusBadge status={overallStatus} />
        {rounds && <span>Round {currentRound}</span>}
      </div>

      {/* Action buttons */}
      <div className="d-flex gap-3 my-3 flex-wrap">
        {overallStatus === 'rejected' && (String(submission.attendee_id) === String(userId) || role === 'attendee') && (
          <button className="btn btn-primary" onClick={() => navigate(`/submissions/${uuid}/review`)}>
            📝 Review &amp; Add Remarks
          </button>
        )}
        {overallStatus === 'under_review' && (String(submission.assigned_to) === String(userId) || isInspector) && (
          <button className="btn btn-primary" onClick={() => navigate(`/submissions/${uuid}/reinspect`)}>
            🔄 Start Re-inspection
          </button>
        )}
      </div>

      {/* Latest decision banner */}
      {submission.status !== 'pending' && submission.status !== 'submitted' && overallStatus !== 'under_review' && (
        <div className={`alert ${overallStatus === 'approved' ? 'alert-success' : 'alert-danger'} mb-3`}>
          <p className="mb-0 fw-semibold">
            {overallStatus === 'approved' ? '✓ Approved' : '✗ Rejected'}
            {submission.reviewed_by_username && ` by ${submission.reviewed_by_username}`}
            {submission.reviewed_at && (
              <span className="fw-normal ms-2 text-muted small">
                on {new Date(submission.reviewed_at).toLocaleString()}
              </span>
            )}
          </p>
          {submission.review_notes && (
            <p className="mb-0 mt-1 small">{submission.review_notes}</p>
          )}
          {overallStatus === 'rejected' && submission.review_deadline && (() => {
            const deadlinePassed = Date.now() > new Date(submission.review_deadline).getTime();
            return (
              <p className="mb-0 mt-2 small d-flex align-items-center gap-2 flex-wrap">
                <span className="fw-medium">Attendee review deadline:</span>
                <strong className={deadlinePassed ? 'text-danger' : ''}>
                  {new Date(submission.review_deadline).toLocaleString()}
                </strong>
                {deadlinePassed && (
                  <span className="badge bg-danger">Deadline passed</span>
                )}
              </p>
            );
          })()}
        </div>
      )}

      {/* Answers */}
      <div className="mb-4">
        <h2 className="h5 fw-bold mb-3">Answers</h2>
        <div className="d-flex flex-column gap-2">
          {Object.entries(submission.answers).map(([key, value]) => (
            <div key={key} className="d-flex gap-3 p-3 border rounded">
              <dt className="fw-semibold text-muted" style={{ minWidth: '200px', fontSize: '0.9rem' }}>
                {labelMap[key] || `Question #${key}`}
              </dt>
              <dd className="mb-0">{value}</dd>
            </div>
          ))}
        </div>
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div className="mb-4">
          <h2 className="h5 fw-bold mb-3">Images</h2>
          <div className="row row-cols-2 row-cols-md-4 g-3">
            {images.map(img => (
              <div key={img.id} className="col text-center">
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
        <div className="mb-4">
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



