import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions, deleteSubmission } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function SubmissionList() {
  const [submissions, setSubmissions]   = useState([]);
  const [deletingUuid, setDeletingUuid] = useState(null);
  const { isGlobalAdmin, role }         = useAuth();
  const [confirmUuid, setConfirmUuid]   = useState(null);

  const isLocalAdmin = role === 'local_admin';
  const canSeeAll    = isGlobalAdmin || isLocalAdmin;

  useEffect(() => {
    getSubmissions().then(r => setSubmissions(Array.isArray(r.data) ? r.data : []));
  }, []);

  async function handleDelete() {
    const uuid = confirmUuid;
    setConfirmUuid(null);
    try {
      setDeletingUuid(uuid);
      await deleteSubmission(uuid);
      setSubmissions(prev => prev.filter(s => s.submission_uuid !== uuid));
    } catch {
      alert('Failed to delete. Please try again.');
    } finally {
      setDeletingUuid(null);
    }
  }

  return (
    <div>
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item active">Submissions</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">Submissions</h1>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover table-sm">
          <thead className="table-light">
            <tr>
              <th>Date</th><th>Location</th><th>Category</th><th>Schedule</th><th>Title</th><th>Images</th>
              {canSeeAll && <th>Submitted By</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map(s => (
              <tr key={s.id} style={{ opacity: deletingUuid === s.submission_uuid ? 0.4 : 1 }}>
                <td data-label="Date">{new Date(s.submitted_at).toLocaleString()}</td>
                <td data-label="Location">{s.location_name || '—'}</td>
                <td data-label="Category">{s.category_name}</td>
                <td data-label="Schedule">{s.schedule_title || '—'}</td>
                <td data-label="Title">{s.title || '—'}</td>
                <td data-label="Images">{s.image_count}</td>
                {canSeeAll && <td data-label="Submitted By">{s.submitted_by || '—'}</td>}
                <td data-label="Actions" className="d-flex gap-1">
                  <Link to={`/submissions/${s.submission_uuid}`} className="btn btn-sm btn-secondary">
                    View
                  </Link>
                  {canSeeAll && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setConfirmUuid(s.submission_uuid)}
                      disabled={deletingUuid === s.submission_uuid}
                    >
                      {deletingUuid === s.submission_uuid ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmUuid && (
        <ConfirmModal
          title="Delete Submission"
          message="Are you sure you want to delete this submission? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmUuid(null)}
        />
      )}
    </div>
  );
}

