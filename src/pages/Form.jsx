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
      getScheduleById(scheduleId).then(r => setSchedule(r.data)).catch(() => {});
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
        <div className="text-center py-4">
          <p className="fw-semibold mb-1">Inspection not yet available</p>
          <p className="text-muted small">
            This inspection opens on {new Date(schedule.scheduled_at).toLocaleString()}.
          </p>
        </div>
      );
    }
    if (schedule.submission_deadline && now > new Date(schedule.submission_deadline).getTime()) {
      return (
        <div className="text-center py-4">
          <p className="fw-semibold mb-1">Submission deadline has passed</p>
          <p className="text-muted small">
            The deadline was {new Date(schedule.submission_deadline).toLocaleString()}.
            Contact your coordinator to extend the deadline.
          </p>
        </div>
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 fw-bold">{data.category.name}</h1>
      </div>

      {isReadOnly && (
        <div className="alert alert-success">
          You already submitted this form on{' '}
          <strong>{new Date(existing.submitted_at).toLocaleString()}</strong>.
          This is a read-only view of your responses.
        </div>
      )}

      <form onSubmit={isReadOnly ? e => e.preventDefault() : handleNext}
            className="d-flex flex-column gap-3">
        {data.questions.map(q => {
          const visible = isVisible(q);
          return (
            <div key={q.id} className="card card-body" style={{ display: visible ? 'block' : 'none' }}>
              <label className="form-label fw-semibold">
                {q.question_text}
                {q.is_required && !isReadOnly && <span className="text-danger ms-1">*</span>}
              </label>

              {q.field_type === 'text' && (
                <input className="form-control" type="text"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly} />
              )}
              {q.field_type === 'textarea' && (
                <textarea className="form-control"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly} />
              )}
              {q.field_type === 'number' && (
                <input className="form-control" type="number"
                  value={answers[String(q.id)] || ''}
                  onChange={e => handleChange(q.id, e.target.value)}
                  required={visible && q.is_required && !isReadOnly}
                  disabled={isReadOnly} />
              )}
              {q.field_type === 'yesno' && (
                <div className="d-flex gap-3 flex-wrap">
                  {['Yes', 'No'].map(opt => (
                    <label key={opt} className="form-check-label d-flex align-items-center gap-1">
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
                <select className="form-select"
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
                <div className="d-flex gap-3 flex-wrap">
                  {safeOptions(q.options).map(opt => (
                    <label key={opt} className="form-check-label d-flex align-items-center gap-1">
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
          <div className="d-flex gap-3 flex-wrap mt-2">
            <button type="submit" className="btn btn-primary">
              Next: Upload Images
            </button>
          </div>
        )}
      </form>
    </div>
  );
}



