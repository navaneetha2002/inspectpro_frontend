import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getSubmission, getRounds, submitRound, submitRoundDecision, updateScheduleStatus } from '../../api/api';
import { RoundTimeline } from '../../components/RoundTimeline';

function safeOptions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()); }
}

export default function ReInspect() {
  const { uuid }   = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
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
    const incoming = Array.from(selected);
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...incoming.filter(f => !existingNames.has(f.name))];
    });
    setPreviews(prev => [...prev, ...incoming.map(f => URL.createObjectURL(f))]);
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (files.length === 0) {
      setError('Please upload at least one image before submitting.');
      return;
    }

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
      <div className="sticky-top bg-white border-bottom py-2 mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-1">
            <li className="breadcrumb-item" role="button"
                onClick={() => navigate(`/submissions/${uuid}`)}>
              {submission.category_name} Inspection
            </li>
            <li className="breadcrumb-item active">Re-inspection Round {rounds.current_round}</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <div>
            <h1 className="h4 fw-bold mb-0">Re-inspection — Round {rounds.current_round}</h1>
            {(rounds.schedule_title || submission.category_name) && (
              <p className="text-muted small mb-0 mt-1">
                {rounds.schedule_title || submission.category_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {roundHistory.length > 0 && (
        <div className="mb-4">
          <RoundTimeline rounds={roundHistory} labelMap={data.labelMap} />
        </div>
      )}

      <div className="alert alert-info py-2 small mb-3">
        Review the attendee's remarks above and update your answers below.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">

        {data.questions?.map(q => (
          <div key={q.id} className="card card-body">
            <label className="form-label fw-semibold">
              {q.question_text}
              {q.is_required && <span className="text-danger ms-1">*</span>}
            </label>

            {remarksByQuestion[String(q.id)] && (
              <div className="alert alert-warning py-2 small mb-2">
                <strong>Attendee remark:</strong> {remarksByQuestion[String(q.id)]}
              </div>
            )}

            {q.field_type === 'text' && (
              <input className="form-control" type="text"
                value={answers[String(q.id)] || ''}
                onChange={e => handleChange(q.id, e.target.value)}
                required={q.is_required} />
            )}
            {q.field_type === 'textarea' && (
              <textarea className="form-control"
                value={answers[String(q.id)] || ''}
                onChange={e => handleChange(q.id, e.target.value)}
                required={q.is_required} />
            )}
            {q.field_type === 'number' && (
              <input className="form-control" type="number"
                value={answers[String(q.id)] || ''}
                onChange={e => handleChange(q.id, e.target.value)}
                required={q.is_required} />
            )}
            {q.field_type === 'yesno' && (
              <div className="d-flex gap-3 flex-wrap">
                {['Yes', 'No'].map(opt => (
                  <label key={opt} className="form-check-label d-flex align-items-center gap-1">
                    <input type="radio" name={`q_${q.id}`} value={opt}
                      checked={answers[String(q.id)] === opt}
                      onChange={() => handleChange(q.id, opt)}
                      required={q.is_required} /> {opt}
                  </label>
                ))}
              </div>
            )}
            {q.field_type === 'select' && (
              <select className="form-select"
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
              <div className="d-flex gap-3 flex-wrap">
                {safeOptions(q.options).map(opt => (
                  <label key={opt} className="form-check-label d-flex align-items-center gap-1">
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
        <div className="mb-4">
          <h2 className="h5 fw-bold mb-3">
            Upload Images <span className="text-danger">*</span>
          </h2>
          <div className="border border-2 border-dashed rounded p-5 text-center bg-light cursor-pointer"
            onClick={() => document.getElementById('reinspectFiles').click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}>
            <div className="upload-icon">📷</div>
            <p>Click or drag images here</p>
            <p className="upload-hint">JPEG, PNG, GIF, WEBP — max 10MB each · select multiple at once</p>
            <input id="reinspectFiles" type="file" className="d-none"
              multiple accept="image/*" onChange={e => handleFiles(e.target.files)} />
          </div>
          {previews.length > 0 && (
            <div className="row row-cols-2 row-cols-md-4 g-3 mt-3">
              {previews.map((src, i) => (
                <div key={i} className="preview-item" style={{ position: 'relative' }}>
                  <img src={src} alt={files[i].name} />
                  <span>{files[i].name}</span>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: '#dc2626', color: '#fff', border: 'none',
                      borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                      fontWeight: 700, fontSize: 14, lineHeight: '22px', padding: 0,
                    }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decision panel */}
        <div className="card card-body mb-3">
          <h2 className="h5 fw-bold mb-3">Inspector Decision</h2>

          <div className="mb-3">
            <label className="form-label fw-semibold">
              Notes <span className="text-muted fw-normal">(optional)</span>
            </label>
            <textarea
              className="form-control"
              placeholder="Add observations or reason for decision…"
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="d-flex gap-3">
            <button type="button"
              className={`btn flex-fill ${decision === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => { setDecision('approved'); setReviewDeadline(''); }}>
              ✓ Approve
            </button>
            <button type="button"
              className={`btn flex-fill ${decision === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setDecision('rejected')}>
              ✗ Reject
            </button>
          </div>

          {decision && (
            <p className={`small fw-semibold mt-2 mb-0 ${decision === 'approved' ? 'text-success' : 'text-danger'}`}>
              {decision === 'approved' ? '✓ Marked as Approved' : '✗ Marked as Rejected'}
              {' '}
              <span className="fw-normal text-decoration-underline"
                style={{ cursor: 'pointer' }}
                onClick={() => { setDecision(null); setReviewDeadline(''); }}>
                Change
              </span>
            </p>
          )}

          {decision === 'rejected' && (
            <div className="alert alert-warning mt-3 mb-0">
              <label className="form-label fw-semibold text-danger-emphasis">
                Attendee Review Deadline <span className="text-danger">*</span>
              </label>
              <p className="small mb-2">
                Set a deadline by which the attendee must submit their review remarks.
              </p>
              <input
                type="datetime-local"
                className="form-control"
                value={reviewDeadline}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setReviewDeadline(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        <div className="d-flex gap-3 flex-wrap mt-2">
          <button type="submit"
            className={`btn ${decision === 'rejected' ? 'btn-danger' : 'btn-success'}`}
            disabled={submitting || files.length === 0 || !decision}>
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






