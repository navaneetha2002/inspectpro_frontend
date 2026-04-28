import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubmissions } from '../../api/api';

export default function SubmissionList() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => { getSubmissions().then(r => setSubmissions(r.data)); }, []);

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
            <tr key={s.id}>
              <td>{new Date(s.submitted_at).toLocaleString()}</td>
              <td>{s.category_name}</td>
              <td>{s.image_count}</td>
              <td>
                <Link to={`/submissions/${s.submission_uuid}`} className="btn btn-sm btn-secondary">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}