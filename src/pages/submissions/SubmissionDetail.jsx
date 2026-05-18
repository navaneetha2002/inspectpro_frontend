import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSubmission, deleteSubmission } from '../../api/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { PERMISSIONS } from '../../config/permissions';

// Status badge helper
function StatusBadge({ status }) {
  const styles = {
    pending:  { background: '#fefce8', color: '#854d0e', border: '1px solid #fde047' },
    approved: { background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' },
    rejected: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' },
  };
  const labels = { pending: '⏳ Pending', approved: '✓ Approved', rejected: '✗ Rejected' };
  const s = styles[status] || styles.pending;
  return (
    <span style={{
      ...s, padding: '0.25rem 0.75rem', borderRadius: '999px',
      fontSize: '0.85rem', fontWeight: 600, display: 'inline-block',
    }}>
      {labels[status] || status}
    </span>
  );
}

export default function SubmissionDetail() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { isGlobalAdmin } = useAuth();
  const { hasPermission } = usePermissions();
  const canDelete = isGlobalAdmin || hasPermission(PERMISSIONS.VIEW_SUBMISSIONS);
  const [data, setData] = useState(null);
  const [deleting, setDeleting] = useState(false);

useEffect(() => {
  getSubmission(uuid).then(r => {
    setData(r.data);
  });
}, [uuid]);

  if (!data) return <p>Loading...</p>;
  const { submission, images, labelMap } = data;

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    setDeleting(true);
    try {
      await deleteSubmission(uuid);
      navigate('/submissions');
    } catch (err) {
      alert('Failed to delete submission.');
    } finally {
      setDeleting(false);
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
            <button onClick={handleDelete} className="btn btn-danger" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Submission'}
            </button>
          )}
        </div>
      </div>
      <div className="detail-meta">
        <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
      </div>
      {/* ── Review details block (only shown once reviewed) ── */}
      {submission.status && submission.status !== 'pending' && (
        <div style={{
          margin: '1rem 0', padding: '1rem 1.25rem', borderRadius: '10px',
          background: submission.status === 'approved' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${submission.status === 'approved' ? '#86efac' : '#fca5a5'}`,
        }}>
          <p style={{ margin: 0, fontWeight: 600,
            color: submission.status === 'approved' ? '#166534' : '#991b1b' }}>
            {submission.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
            {submission.reviewed_by_username && (
              <span style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                by {submission.reviewed_by_username}
              </span>
            )}
            {submission.reviewed_at && (
              <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: '#64748b' }}>
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
      {images.length > 0 && (
        <div className="detail-section">
          <h2>Images</h2>
          <div className="image-gallery">
            {images.map(img => (
              <div key={img.id} className="gallery-item">
                <img src={`https://inspectpro-backend.cfapps.eu10-004.hana.ondemand.com/api/form/image/${img.id}`} alt={img.original_name} />
                <span>{img.original_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}