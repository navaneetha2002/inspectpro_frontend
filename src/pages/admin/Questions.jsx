import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, deleteQuestion } from '../../api/api';
import ConfirmModal from '../../components/ConfirmModal';

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    getQuestions()
      .then(r => setQuestions(Array.isArray(r.data) ? r.data : []))
      .catch(() => setQuestions([]));
  }, []);

  async function handleDelete() {
    const id = confirmId;
    setConfirmId(null);
    await deleteQuestion(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  const byCategory = questions.reduce((acc, q) => {
    if (!acc[q.category_name]) acc[q.category_name] = [];
    acc[q.category_name].push(q);
    return acc;
  }, {});

  return (
    <div>
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item active">Questions Admin</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <h1 className="h4 fw-bold mb-0">Manage Questions</h1>
          <Link to="/admin/questions/new" className="btn btn-primary">+ Add Question</Link>
        </div>
      </div>

      {Object.entries(byCategory).map(([cat, qs]) => (
        <section key={cat} className="mb-4">
          <h2 className="fs-6 fw-bold text-primary border-bottom border-2 border-primary pb-1 mb-3">{cat}</h2>
          <div className="table-responsive">
            <table className="table table-bordered table-hover table-sm">
              <thead className="table-light">
                <tr>
                  <th>Q.No</th><th>Question</th>
                  <th>Type</th><th>Required</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {qs.map(q => (
                  <tr key={q.id}>
                    <td data-label="Q.No">{q.order_index}</td>
                    <td data-label="Question">{q.question_text}</td>
                    <td data-label="Type">
                      <span className="badge bg-light text-dark border">{q.field_type}</span>
                    </td>
                    <td data-label="Required">{q.is_required ? '✔' : '—'}</td>
                    <td data-label="Actions" className="d-flex gap-1">
                      <Link to={`/admin/questions/${q.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                      <button onClick={() => setConfirmId(q.id)} className="btn btn-sm btn-danger">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {confirmId && (
        <ConfirmModal
          title="Delete Question"
          message="Are you sure you want to delete this question? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

