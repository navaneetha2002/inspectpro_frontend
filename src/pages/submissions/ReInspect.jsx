import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubmission, getRounds, submitRound, submitRoundDecision } from '../../api/api';
import { RoundTimeline } from '../../components/RoundTimeline';

function safeOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()); }
}

export default function ReInspect() {
  const { uuid }   = useParams();
  const navigate   = useNavigate();
  const [data, setData]       = useState(null);
  const [rounds, setRounds]   = useState(null);
  const [answers, setAnswers] = useState({});
  const [decision, setDecision]         = useState(null);
  const [reviewNotes, setReviewNotes]   = useState('');
  const [reviewDeadline, setReviewDeadline] = useState('');
  const [files, setFiles]               = useState([]);
  const [previews, setPreviews]         = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState(null);

  useEffect(() => {
    Promise.all([getSubmission(uuid), getRounds(uuid)])
      .then(([subRes, roundsRes]) => {
        setData(subRes.data);
        setRounds(roundsRes.data);
        const prevRound = roundsRes.data.rounds.find(
          r => r.round_number === roundsRes.data.current_round - 1
        );
        if (prevRound?.answers) setAnswers(prevRound.answers);
      })
      .catch(() => setError('Failed to load inspection data.'));
  }, [uuid]);

  if (!data || !rounds) return <p>Loading…</p>;

  const { submission, labelMap } = data;

  const prevRound = rounds.rounds.find(
    r => r.round_number === rounds.current_round - 1
  );

  const remarksByQuestion = {};
  prevRound?.attendee_remarks?.forEach(ar => {
    remarksByQuestion[String(ar.question_id)] = ar.remark;
  });

  // Collect full round history for the history panel (oldest first, exclude current)
  const roundHistory = [...(rounds.rounds ?? [])]
    .filter(r => r.round_number < rounds.current_round)
    .sort((a, b) => a.round_number - b.round_number);

  if (submission.overall_status !== 'under_review') {
    return (
      <div>
        <p>This submission is not awaiting re-inspection.</p>
        <button className="btn btn-secondary" onClick={() => navigate(`/submissions/${uuid}`)}>
          Back
        </button>
      </div>
    );
  }

  function handleChange(qId, value) {
    setAnswers(prev => ({ ...prev, [String(qId)]: value }));
  }

  function handleFiles(selected) {
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    console.log('submitting decision:', {
  decision,
  reviewNotes,
  reviewDeadline,
});

    if (!decision) {
      setError('Please approve or reject before submitting.');
      return;
    }

    if (decision === 'rejected' && !reviewDeadline) {
      setError('Please set a deadline for the attendee to submit their review.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('answers', JSON.stringify(answers));
      files.forEach(f => fd.append('images', f));
      const { data: roundData } = await submitRound(uuid, fd);

      await submitRoundDecision(
        uuid,
        roundData.round_id,
        decision,
        reviewNotes,
       reviewDeadline || null 
      );

      navigate(`/submissions/${uuid}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="sticky-header">
        <nav className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate(`/submissions/${uuid}`)}>
            {submission.category_name} Inspection
          </span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Re-inspection Round {rounds.current_round}</span>
        </nav>
        <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <h1>Re-inspection — Round {rounds.current_round}</h1>
        </div>
      </div>

      {/* ── Round History ── */}
      {roundHistory.length > 0 && (
        <div className="detail-section">
          <RoundTimeline rounds={roundHistory} labelMap={data.labelMap} />
        </div>
      )}

      <div style={{
        padding: '0.85rem 1rem', marginBottom: '1.5rem', borderRadius: 8,
        background: '#fdf4ff', border: '1px solid #e9d5ff', color: '#6b21a8',
        fontSize: '0.9rem',
      }}>
        Review the attendee's remarks above and update your answers below.
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8,
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="question-form">

        {/* Questions with attendee remarks shown inline */}
        {data.questions?.map(q => (
          <div key={q.id} className="question-block">
            <label className="question-label">
              {q.question_text}
              {q.is_required && <span className="required">*</span>}
            </label>

            {remarksByQuestion[String(q.id)] && (
              <div style={{
                padding: '0.5rem 0.75rem', marginBottom: '0.5rem',
                background: '#fdf4ff', border: '1px solid #e9d5ff',
                borderRadius: 6, fontSize: '0.83rem', color: '#6b21a8',
              }}>
                <strong>Attendee remark:</strong> {remarksByQuestion[String(q.id)]}
              </div>
            )}

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

        {/* Image upload */}
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Upload Images <span style={{ fontWeight: 400, fontSize: '0.85rem', color: '#64748b' }}>(optional)</span></h3>
          <div className="upload-area" onClick={() => document.getElementById('reinspectFiles').click()}>
            <div className="upload-icon">📷</div>
            <p>Click to upload images</p>
            <input id="reinspectFiles" type="file" className="file-input"
              multiple accept="image/*" onChange={e => handleFiles(e.target.files)} />
          </div>
          {previews.length > 0 && (
            <div className="preview-grid" style={{ marginTop: '1rem' }}>
              {previews.map((src, i) => (
                <div key={i} className="preview-item">
                  <img src={src} alt={files[i].name} />
                  <span>{files[i].name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decision panel */}
        <div style={{
          marginTop: '2rem', padding: '1.25rem',
          border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc',
        }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>
            Inspector Decision
          </h3>

          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>
            Notes <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            className="form-input form-textarea"
            placeholder="Add observations or reason for decision…"
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            style={{ marginBottom: '1rem', width: '100%' }}
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button"
              onClick={() => { setDecision('approved'); setReviewDeadline(''); }}
              style={{
                flex: 1, padding: '0.65rem',
                background: decision === 'approved' ? '#16a34a' : '#f0fdf4',
                color: decision === 'approved' ? '#fff' : '#16a34a',
                border: '2px solid #16a34a', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer',
              }}>
              ✓ Approve
            </button>
            <button type="button"
              onClick={() => setDecision('rejected')}
              style={{
                flex: 1, padding: '0.65rem',
                background: decision === 'rejected' ? '#dc2626' : '#fef2f2',
                color: decision === 'rejected' ? '#fff' : '#dc2626',
                border: '2px solid #dc2626', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer',
              }}>
              ✗ Reject
            </button>
          </div>

          {decision && (
            <p style={{
              margin: '0.5rem 0 0', fontSize: '0.875rem', fontWeight: 500,
              color: decision === 'approved' ? '#16a34a' : '#dc2626',
            }}>
              {decision === 'approved' ? '✓ Marked as Approved' : '✗ Marked as Rejected'}
              {' '}<span
                style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 400 }}
                onClick={() => { setDecision(null); setReviewDeadline(''); }}>
                Change
              </span>
            </p>
          )}

          {decision === 'rejected' && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.875rem', color: '#9a3412' }}>
                Attendee Review Deadline <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#c2410c' }}>
                Set a deadline by which the attendee must submit their review remarks.
              </p>
              <input
                type="datetime-local"
                className="form-input"
                value={reviewDeadline}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setReviewDeadline(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button type="submit"
            className={`btn ${decision === 'rejected' ? 'btn-danger' : 'btn-success'}`}
            disabled={submitting || !decision}
            style={{ opacity: !decision ? 0.5 : 1, cursor: !decision ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting…'
              : decision === 'approved' ? '✓ Submit Approved Re-inspection'
              : decision === 'rejected' ? '✗ Submit Rejected Re-inspection'
              : 'Select a Decision First'}
          </button>
          <button type="button" className="btn btn-secondary"
            onClick={() => navigate(`/submissions/${uuid}`)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}