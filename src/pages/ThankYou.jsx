import { useParams, Link } from 'react-router-dom';

export default function ThankYou() {
  const { uuid } = useParams();
  return (
    <div className="text-center py-5 px-3">
      <div className="display-1 mb-2">✅</div>
      <h1 className="h2 fw-bold mb-2">Inspection Submitted!</h1>
      <p className="text-muted my-3">Reference: {uuid}</p>
      <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
        <Link to="/" className="btn btn-primary">New Inspection</Link>
        <Link to={`/submissions/${uuid}`} className="btn btn-secondary">View Submission</Link>
      </div>
    </div>
  );
}

