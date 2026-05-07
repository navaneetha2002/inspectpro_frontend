import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions, deleteSubmission } from '../../api/api';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../context/AuthContext';

export default function SubmissionList() {
  const [submissions, setSubmissions] = useState([]);
  const [deletingUuid, setDeletingUuid] = useState(null);
  const { isGlobalAdmin, userId } = useAuth();
  const [confirmUuid,  setConfirmUuid]  = useState(null);

  useEffect(() => {
    getSubmissions().then(r => {
      const all = r.data;
      console.log('[DEBUG] userId from token:', userId);
      console.log('[DEBUG] all keys in a submission:', all[0] ? Object.keys(all[0]) : 'no data');
      console.log('[DEBUG] first submission full object:', JSON.stringify(all[0]));
      setSubmissions(
        isGlobalAdmin ? all : all.filter(s => s.user_id === userId)
      );
    });
  }, [isGlobalAdmin, userId]);

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
      <div className="sticky-header">
        <nav className="breadcrumb">
          <span className="breadcrumb-current">Submissions</span>
        </nav>
        <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <h1>Submissions</h1>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Location</th><th>Category</th><th>Images</th>
            {isGlobalAdmin && <th>Submitted By</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.id} style={{ opacity: deletingUuid === s.submission_uuid ? 0.4 : 1 }}>
              <td data-label="Date">{new Date(s.submitted_at).toLocaleString()}</td>
              <td data-label="Location">{s.location_name || '—'}</td>
              <td data-label="Category">{s.category_name}</td>
              <td data-label="Images">{s.image_count}</td>
              {isGlobalAdmin && <td data-label="Submitted By">{s.submitted_by || '—'}</td>}
              <td data-label="Actions" className="action-cell">
                <Link to={`/submissions/${s.submission_uuid}`} className="btn btn-sm btn-secondary">
                  View
                </Link>
                {isGlobalAdmin && (  // ← only admin can delete
                  <button
                    className="btn btn-sm btn-danger"
                    style={{ marginLeft: 8 }}
                    onClick={() => handleDelete(s.submission_uuid)}
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
