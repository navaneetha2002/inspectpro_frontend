import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubmission } from '../../api/api';

export default function SubmissionDetail() {
  const { uuid } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => { getSubmission(uuid).then(r => setData(r.data)); }, [uuid]);

  if (!data) return <p>Loading...</p>;
  const { submission, images, labelMap } = data;

  return (
    <div>
      <div className="page-header">
        <h1>{submission.category_name} Inspection</h1>
        <Link to="/submissions" className="btn btn-secondary">← Back</Link>
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
                <img src={`http://localhost:3000/api/form/image/${img.id}`} alt={img.original_name} />
                <span>{img.original_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}