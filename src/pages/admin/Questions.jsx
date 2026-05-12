import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, deleteQuestion } from '../../api/api';
import ConfirmModal from '../../components/ConfirmModal';

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => { getQuestions().then(r => setQuestions(Array.isArray(r.data) ? r.data : [])); }, []);

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
      <div className="sticky-header">
        <nav className="breadcrumb">
          <span className="breadcrumb-current">Questions Admin</span>
        </nav>
        <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <h1>Manage Questions</h1>
          <Link to="/admin/questions/new" className="btn btn-primary">+ Add Question</Link>
        </div>
      </div>

      {Object.entries(byCategory).map(([cat, qs]) => (
        <section key={cat} className="admin-section">
          <h2 className="section-title">{cat}</h2>
          <table className="data-table">
            <thead>
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
                  <td data-label="Type"><span className="type-badge">{q.field_type}</span></td>
                  <td data-label="Required">{q.is_required ? '✔' : '—'}</td>
                  <td data-label="Actions" className="action-cell">
                    <Link to={`/admin/questions/${q.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                    <button onClick={() => setConfirmId(q.id)} className="btn btn-sm btn-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
