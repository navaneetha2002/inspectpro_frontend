import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getFormStep } from '../api/api';

function safeOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()); }
}

export default function Form() {
  const { slug }                    = useParams();
  const [searchParams]              = useSearchParams();
  const navigate                    = useNavigate();
  const [data, setData]             = useState(null);
  const [answers, setAnswers]       = useState({});
  const group                       = parseInt(searchParams.get('group')) || 1;

  useEffect(() => {
    // Restore answers from sessionStorage
    const saved = sessionStorage.getItem(`answers_${slug}`);
    if (saved) setAnswers(JSON.parse(saved));
    getFormStep(slug, group).then(r => setData(r.data));
  }, [slug, group]);

  function handleChange(qId, value) {
    setAnswers(prev => ({ ...prev, [String(qId)]: value }));
  }

  function isVisible(q) {
    if (!q.conditional_on_question_id || !q.conditional_on_value) return true;
    const val = answers[String(q.conditional_on_question_id)] || '';
    return val.toLowerCase() === q.conditional_on_value.toLowerCase();
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Save answers to sessionStorage to persist across steps
    sessionStorage.setItem(`answers_${slug}`, JSON.stringify(answers));

    if (data.isLastGroup) {
      navigate(`/form/${slug}/images`);
    } else {
      navigate(`/form/${slug}?group=${group + 1}`);
    }
  }

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <div className="form-header">
        <h1>{data.category.name}</h1>
        <div className="step-indicator">
          {Array.from({ length: data.maxGroup }, (_, i) => (
            <div key={i} className={`step-dot ${i + 1 < group ? 'done' : i + 1 === group ? 'active' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="question-form">
        {data.questions.filter(isVisible).map(q => (
          <div key={q.id} className="question-block">
            <label className="question-label">
              {q.question_text}
              {q.is_required && <span className="required">*</span>}
            </label>

            {q.field_type === 'text' && (
              <input className="form-input" type="text"
                     value={answers[String(q.id)] || ''}
                     onChange={e => handleChange(q.id, e.target.value)}
                     required={q.is_required} />
            )}
            {q.field_type === 'textarea' && (
              <textarea className="form-input form-textarea"
                        value={answers[String(q.id)] || ''}
                        onChange={e => handleChange(q.id, e.target.value)}
                        required={q.is_required} />
            )}
            {q.field_type === 'number' && (
              <input className="form-input" type="number"
                     value={answers[String(q.id)] || ''}
                     onChange={e => handleChange(q.id, e.target.value)}
                     required={q.is_required} />
            )}
            {q.field_type === 'yesno' && (
              <div className="radio-group">
                {['Yes', 'No'].map(opt => (
                  <label key={opt} className="radio-option">
                    <input type="radio" name={`q_${q.id}`} value={opt}
                           checked={answers[String(q.id)] === opt}
                           onChange={() => handleChange(q.id, opt)}
                           required={q.is_required} /> {opt}
                  </label>
                ))}
              </div>
            )}
            {q.field_type === 'select' && (
              <select className="form-input"
                      value={answers[String(q.id)] || ''}
                      onChange={e => handleChange(q.id, e.target.value)}
                      required={q.is_required}>
                <option value="">-- Select --</option>
                {safeOptions(q.options).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {q.field_type === 'radio' && (
              <div className="radio-group">
                {safeOptions(q.options).map(opt => (
                  <label key={opt} className="radio-option">
                    <input type="radio" name={`q_${q.id}`} value={opt}
                           checked={answers[String(q.id)] === opt}
                           onChange={() => handleChange(q.id, opt)}
                           required={q.is_required} /> {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {data.isLastGroup ? 'Next: Upload Images' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
}