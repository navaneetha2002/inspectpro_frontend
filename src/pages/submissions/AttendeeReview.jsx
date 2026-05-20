import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubmission, getRounds, submitRemarks, uploadAttendeeImages, submitAttendeeReview } from '../../api/api';

export default function AttendeeReview() {
   console.log('AttendeeReview mounted');
  const { uuid }     = useParams();
  const navigate     = useNavigate();
  const [data, setData]     = useState(null);
  const [rounds, setRounds] = useState(null);
  const [remarks, setRemarks]   = useState({});   // { [question_id]: remark }
  const [files, setFiles]       = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [loadError, setLoadError]   = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSubmission(uuid), getRounds(uuid)])
      .then(([subRes, roundsRes]) => {
        console.log('[AttendeeReview] submission API response:', subRes.data);
        console.log('[AttendeeReview] rounds API response:', roundsRes.data);
        setData(subRes.data);
        setRounds(roundsRes.data);
      })
      .catch(err => {
        console.error('[AttendeeReview] load error — status:', err.response?.status, '| data:', err.response?.data, '| full:', err);
        setLoadError(
          err.response?.status === 403 ? 'You do not have permission to view this submission.' :
          err.response?.status === 404 ? 'Submission not found.' :
          err.response?.data?.error   || 'Failed to load submission data. Check console for details.'
        );
      })
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading)   return <p style={{ padding: '2rem' }}>Loading…</p>;
  if (loadError) return (
    <div style={{ padding: '1rem', margin: '1rem', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' }}>
      <strong>Error:</strong> {loadError}
    </div>
  );
  if (!data || !rounds) return <p style={{ padding: '2rem' }}>No data available.</p>;

  const { submission, labelMap } = data;
  const currentRound = rounds.rounds.find(r => r.round_number === rounds.current_round);

  console.log('[AttendeeReview] overall_status:', submission.overall_status);
  console.log('[AttendeeReview] rounds.current_round:', rounds.current_round, '| all rounds:', rounds.rounds.map(r => ({ id: r.id, num: r.round_number, status: r.status, hasAnswers: !!r.answers && Object.keys(r.answers||{}).length > 0 })));
  console.log('[AttendeeReview] currentRound:', currentRound);

  if (!currentRound) {
    console.warn('[AttendeeReview] currentRound not found — rounds.current_round:', rounds.current_round, 'available round_numbers:', rounds.rounds.map(r => r.round_number));
    return <p style={{ padding: '2rem', color: '#991b1b' }}>No round data found (current_round={rounds.current_round}, available=[{rounds.rounds.map(r => r.round_number).join(', ')}]).</p>;
  }
  if (submission.overall_status !== 'rejected') {
    console.warn('[AttendeeReview] overall_status is not rejected:', submission.overall_status);
    return <p style={{ padding: '2rem', color: '#991b1b' }}>This submission is not in a rejected state — status is: <strong>{submission.overall_status}</strong></p>;
  }

  // When the backend auto-creates a new pending round upon rejection, currentRound has
  // no answers yet. We display answers from the most recent rejected round so the
  // attendee can respond to the inspector's findings, while still submitting to currentRound.
  const rejectedRound = [...rounds.rounds]
    .sort((a, b) => b.round_number - a.round_number)
    .find(r => r.status === 'rejected');
  const answersToReview = (rejectedRound?.answers && Object.keys(rejectedRound.answers).length > 0)
    ? rejectedRound.answers
    : (currentRound.answers || {});
  const reviewNotes = rejectedRound?.review_notes ?? currentRound.review_notes;

  console.log('[AttendeeReview] overall_status:', submission.overall_status);
  console.log('[AttendeeReview] rounds.current_round:', rounds.current_round);
  console.log('[AttendeeReview] currentRound:', currentRound);
  console.log('[AttendeeReview] rejectedRound:', rejectedRound);
  console.log('[AttendeeReview] answersToReview:', answersToReview);
  console.log('[AttendeeReview] labelMap:', labelMap);

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
    setError(null);

    const remarksList = Object.entries(remarks)
      .filter(([, remark]) => remark.trim())
      .map(([question_id, remark]) => ({ question_id: Number(question_id), remark }));

    if (files.length === 0) {
      setError('Please upload at least one image before submitting your review.');
      return;
    }

    if (!remarksList.length) {
      setError('Please add at least one remark before submitting your review.');
      return;
    }

    setSubmitting(true);
    const targetRoundId = rejectedRound?.id ?? currentRound.id;
    console.log('[AttendeeReview] submitting — targetRoundId:', targetRoundId, '| remarks:', remarksList);
    try {
      // 1. Submit remarks
      await submitRemarks(uuid, targetRoundId, remarksList);

      // 2. Upload attendee images if any
      if (files.length) {
        const fd = new FormData();
        files.forEach(f => fd.append('images', f));
        await uploadAttendeeImages(uuid, targetRoundId, fd);
      }

      // 3. Finalise review — triggers next round creation
      await submitAttendeeReview(uuid, targetRoundId);

      navigate(`/submissions/${uuid}`, {
        state: { message: 'Review submitted. The inspector has been notified.' },
      });
    } catch (err) {
      console.error('[AttendeeReview] submit error:', err.response?.status, err.response?.data, err);
      setError(err.response?.data?.error || 'Failed to submit review. Please try again.');
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
          <span className="breadcrumb-current">Attendee Review</span>
        </nav>
        <div className="page-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <h1>Review Inspection — Round {currentRound.round_number}</h1>
        </div>
      </div>

      <div style={{
        padding: '0.85rem 1rem', marginBottom: '1.5rem', borderRadius: 8,
        background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b',
        fontSize: '0.9rem',
      }}>
        This inspection was <strong>rejected</strong>
        {reviewNotes && `: "${reviewNotes}"`}.
        Add your remarks below for each question and submit for re-inspection.
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 8,
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Per-question remarks */}
        <div className="detail-section">
          <h2>Add Remarks Per Question</h2>
          {Object.entries(answersToReview).map(([qId, answer]) => (
            <div key={qId} style={{
              padding: '1rem', marginBottom: '0.75rem',
              border: '1px solid #e2e8f0', borderRadius: 8, background: '#fafafa',
            }}>
              <p style={{ fontWeight: 600, margin: '0 0 0.25rem', fontSize: '0.9rem' }}>
                {labelMap[qId] || `Question #${qId}`}
              </p>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#475569' }}>
                Inspector answered: <strong>{answer}</strong>
              </p>
              <textarea
                className="form-input form-textarea"
                placeholder="Add your remark for this question (optional)…"
                value={remarks[qId] || ''}
                onChange={e => setRemarks(prev => ({ ...prev, [qId]: e.target.value }))}
                rows={2}
                style={{ marginBottom: 0 }}
              />
            </div>
          ))}
        </div>

        {/* Image upload */}
        <div className="detail-section">
          <h2>Upload Evidence Images <span style={{ color: 'var(--danger)' }}>*</span></h2>
          <div className="upload-area"
            onClick={() => document.getElementById('attendeeFileInput').click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📷</div>
            <p>Click or drag images here</p>
            <p className="upload-hint">JPEG, PNG, GIF, WEBP — max 10MB each · select multiple at once</p>
            <input
              id="attendeeFileInput" type="file" className="file-input"
              multiple accept="image/*"
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
          {previews.length > 0 && (
            <div className="preview-grid" style={{ marginTop: '1rem' }}>
              {previews.map((src, i) => (
                <div key={i} className="preview-item" style={{ position: 'relative' }}>
                  <img src={src} alt={files[i].name} />
                  <span>{files[i].name}</span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: '#dc2626', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: 22, height: 22, cursor: 'pointer',
                      fontWeight: 700, fontSize: 14, lineHeight: '22px', padding: 0,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary"
            disabled={submitting || files.length === 0}
            style={{ opacity: (submitting || files.length === 0) ? 0.5 : 1, cursor: (submitting || files.length === 0) ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting Review…' : 'Submit Review for Re-inspection'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/submissions/${uuid}`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}