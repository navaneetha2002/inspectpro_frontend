import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuestions, deleteQuestion } from '../../api/api';

export default function Questions() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => { getQuestions().then(r => setQuestions(r.data)); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this question?')) return;
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
      <div className="page-header">
        <h1>Manage Questions</h1>
        <Link to="/admin/questions/new" className="btn btn-primary">+ Add Question</Link>
      </div>
      {Object.entries(byCategory).map(([cat, qs]) => (
        <section key={cat} className="admin-section">
          <h2 className="section-title">{cat}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th><th>Order</th><th>Question</th>
                <th>Type</th><th>Required</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {qs.map(q => (
                <tr key={q.id}>
                  <td><span className="badge">{q.group_index}</span></td>
                  <td>{q.order_index}</td>
                  <td>{q.question_text}</td>
                  <td><span className="type-badge">{q.field_type}</span></td>
                  <td>{q.is_required ? '✔' : '—'}</td>
                  <td className="action-cell">
                    <Link to={`/admin/questions/${q.id}/edit`} className="btn btn-sm btn-secondary">Edit</Link>
                    <button onClick={() => handleDelete(q.id)} className="btn btn-sm btn-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}