import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubmission, deleteSubmission } from '../../api/api';
import { useNavigate } from 'react-router-dom';

export default function SubmissionDetail() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { getSubmission(uuid).then(r => setData(r.data)); }, [uuid]);

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
          <button onClick={handleDelete} className="btn btn-danger" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Submission'}
          </button>
        </div>
      </div>
      <div className="detail-meta">
        <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
      </div>
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