import { useParams, Link } from 'react-router-dom';

export default function ThankYou() {
  const { uuid } = useParams();
  return (
    <div className="thankyou-page">
      <div className="thankyou-icon">✅</div>
      <h1>Inspection Submitted!</h1>
      <p className="submission-id">Reference: {uuid}</p>
      <div className="thankyou-actions">
        <Link to="/" className="btn btn-primary">New Inspection</Link>
        <Link to={`/submissions/${uuid}`} className="btn btn-secondary">View Submission</Link>
      </div>
    </div>
  );
}