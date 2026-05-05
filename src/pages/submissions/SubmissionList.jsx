import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions, deleteSubmission } from '../../api/api';

export default function SubmissionList() {
  const [submissions, setSubmissions] = useState([]);
  const [deletingUuid, setDeletingUuid] = useState(null);

  useEffect(() => { getSubmissions().then(r => setSubmissions(r.data)); }, []);

  async function handleDelete(uuid) {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
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
      <div className="page-header"><h1>Submissions</h1></div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Category</th><th>Images</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.id} style={{ opacity: deletingUuid === s.submission_uuid ? 0.4 : 1 }}>
              <td>{new Date(s.submitted_at).toLocaleString()}</td>
              <td>{s.category_name}</td>
              <td>{s.image_count}</td>
              <td className="action-cell">
                <Link to={`/submissions/${s.submission_uuid}`} className="btn btn-sm btn-secondary">
                  View
                </Link>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ marginLeft: 8 }}
                  onClick={() => handleDelete(s.submission_uuid)}
                  disabled={deletingUuid === s.submission_uuid}
                >
                  {deletingUuid === s.submission_uuid ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}