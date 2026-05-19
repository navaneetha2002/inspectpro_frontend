import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getFormStep, getMySubmissionForForm, getScheduleById } from '../api/api';
import { useAuth } from '../context/AuthContext';

function safeOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()); }
}

export default function Form() {
  const { slug }                = useParams();
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const { role }                = useAuth();
  const [data, setData]         = useState(null);
  const [answers, setAnswers]   = useState({});
  const [existing, setExisting] = useState(null);
  const [checking, setChecking] = useState(true);
  const [schedule, setSchedule] = useState(null);

  const locationSlug = searchParams.get('location');
  const scheduleId   = searchParams.get('schedule_id');

  useEffect(() => {
    setChecking(true);
    getMySubmissionForForm(slug, locationSlug, scheduleId)
      .then(r => {
        if (r.data?.uuid) {
          setExisting(r.data);
          setAnswers(r.data.answers || {});
        } else {
          const saved = sessionStorage.getItem(`answers_${slug}`);
          if (saved) setAnswers(JSON.parse(saved));
        }
      })
      .catch(() => {
        const saved = sessionStorage.getItem(`answers_${slug}`);
        if (saved) setAnswers(JSON.parse(saved));
      })
      .finally(() => setChecking(false));
  }, [slug, locationSlug, scheduleId]);

  useEffect(() => {
    getFormStep(slug, 1).then(r => setData(r.data));
  }, [slug]);

  useEffect(() => {
    if (scheduleId) {
      getScheduleById(scheduleId)
        .then(r => setSchedule(r.data))
        .catch(() => {});
    }
  }, [scheduleId]);

  function handleChange(qId, value) {
    setAnswers(prev => ({ ...prev, [String(qId)]: value }));
  }

  function isVisible(q) {
    if (!q.conditional_on_question_id || !q.conditional_on_value) return true;
    const val = answers[String(q.conditional_on_question_id)] || '';
    return val.trim().toLowerCase() === q.conditional_on_value.trim().toLowerCase();
  }

  function handleNext(e) {
    e.preventDefault();
    sessionStorage.setItem(`answers_${slug}`, JSON.stringify(answers));
    const params = new URLSearchParams();
    if (locationSlug) params.set('location', locationSlug);
    if (scheduleId)   params.set('schedule_id', scheduleId);
    navigate(`/form/${slug}/images?${params.toString()}`);
  }

  if (checking || !data) return <p>Loading...</p>;

  const isReadOnly = !!existing;

  if (role === 'inspector' && schedule && !isReadOnly) {
    const now = Date.now();
    if (now < new Date(schedule.scheduled_at).getTime()) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Inspection not yet available</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            This inspection opens on {new Date(schedule.scheduled_at).toLocaleString()}.
          </p>
        </div>
      );
    }
    if (schedule.submission_deadline && now > new Date(schedule.submission_deadline).getTime()) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Submission deadline has passed</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            The deadline was {new Date(schedule.submission_deadline).toLocaleString()}.
            Contact your coordinator to extend the deadline.
          </p>
        </div>
      );
    }
  }

  return (
    <div>
      <div className="form-header">
        <h1>{data.category.name}</h1>
      </div>

      {isReadOnly && (
        <div className="submission-banner" style={{
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: '8px', padding: '0.75rem 1rem',
          marginBottom: '1.5rem', color: '#166534', fontSize: '0.95rem',
        }}>
          You already submitted this form on{' '}
          <strong>{new Date(existing.submitted_at).toLocaleString()}</strong>.
          This is a read-only view of your responses.
        </div>
      )}

      <form onSubmit={isReadOnly ? e => e.preventDefault() : handleNext} className="question-form">
        {data.questions.map(q => {
          const visible = isVisible(q);
          return (
            <div key={q.id} className="question-block" style={{ display: visible ? 'block' : 'none' }}>
              <label className="question-label">
                {q.question_text}
                {q.is_required && !isReadOnly && <span className="required">*</span>}
              </label>

              {q.field_type === 'text' && (
                <input className="form-input" type="text"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly} />
              )}
              {q.field_type === 'textarea' && (
                <textarea className="form-input form-textarea"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly} />
              )}
              {q.field_type === 'number' && (
                <input className="form-input" type="number"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly} />
              )}
              {q.field_type === 'yesno' && (
                <div className="radio-group">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className="radio-option">
                      <input type="radio" name={`q_${q.id}`} value={opt}
                        checked={answers[String(q.id)] === opt}
                        onChange={() => !isReadOnly && handleChange(q.id, opt)}
                        required={visible && q.is_required && !isReadOnly}
                        disabled={isReadOnly} /> {opt}
                    </label>
                  ))}
                </div>
              )}
              {q.field_type === 'select' && (
                <select className="form-input"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly}>
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
                        onChange={() => !isReadOnly && handleChange(q.id, opt)}
                        required={visible && q.is_required && !isReadOnly}
                        disabled={isReadOnly} /> {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!isReadOnly && (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Next: Upload Images
            </button>
          </div>
        )}
      </form>
    </div>
  );
}