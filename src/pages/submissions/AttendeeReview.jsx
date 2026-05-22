import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSubmission, getRounds, submitRemarks, uploadAttendeeImages, submitAttendeeReview, notifyReviewDeadlineMissed } from '../../api/api';

export default function AttendeeReview() {
  const { uuid }     = useParams();
  const navigate     = useNavigate();
  const [data, setData]     = useState(null);
  const [rounds, setRounds] = useState(null);
  const [remarks, setRemarks]   = useState({});
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
        setData(subRes.data);
        setRounds(roundsRes.data);
      })
      .catch(err => {
        setLoadError(
          err.response?.status === 403 ? 'You do not have permission to view this submission.' :
          err.response?.status === 404 ? 'Submission not found.' :
          err.response?.data?.error || 'Failed to load submission data.'
        );
      })
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading)   return <p className="p-4">Loading…</p>;
  if (loadError) return (
    <div className="alert alert-danger m-3"><strong>Error:</strong> {loadError}</div>
  );
  if (!data || !rounds) return <p className="p-4">No data available.</p>;

  const { submission, labelMap } = data;
  const currentRound = rounds.rounds.find(r => r.round_number === rounds.current_round);

  if (!currentRound) return (
    <p className="p-4 text-danger">
      No round data found (current_round={rounds.current_round}).
    </p>
  );
  if (submission.overall_status !== 'rejected') return (
    <p className="p-4 text-danger">
      This submission is not in a rejected state — status is: <strong>{submission.overall_status}</strong>
    </p>
  );

  const rejectedRound = [...rounds.rounds]
    .sort((a, b) => b.round_number - a.round_number)
    .find(r => r.status === 'rejected');
  const answersToReview = (rejectedRound?.answers && Object.keys(rejectedRound.answers).length > 0)
    ? rejectedRound.answers : (currentRound.answers || {});
  const reviewNotes    = rejectedRound?.review_notes ?? currentRound.review_notes;
  const reviewDeadline = rejectedRound?.review_deadline ?? rejectedRound?.attendee_review_deadline ?? null;
  const deadlinePassed = reviewDeadline ? Date.now() > new Date(reviewDeadline).getTime() : false;

  if (deadlinePassed) notifyReviewDeadlineMissed(uuid).catch(() => {});

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const remarksList = Object.entries(remarks)
      .filter(([, remark]) => remark.trim())
      .map(([question_id, remark]) => ({ question_id: Number(question_id), remark }));

    if (files.length === 0) { setError('Please upload at least one image before submitting your review.'); return; }
    if (!remarksList.length) { setError('Please add at least one remark before submitting your review.'); return; }

    setSubmitting(true);
    const targetRoundId = rejectedRound?.id ?? currentRound.id;
    try {
      await submitRemarks(uuid, targetRoundId, remarksList);
      if (files.length) {
        const fd = new FormData();
        files.forEach(f => fd.append('images', f));
        await uploadAttendeeImages(uuid, targetRoundId, fd);
      }
      await submitAttendeeReview(uuid, targetRoundId);
      navigate(`/submissions/${uuid}`, { state: { message: 'Review submitted. The inspector has been notified.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review. Please try again.');
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
            <li className="breadcrumb-item active">Attendee Review</li>
          </ol>
        </nav>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-0">
          <div>
            <h1 className="h4 fw-bold mb-0">Review Inspection — Round {currentRound.round_number}</h1>
            {(submission.schedule_title || submission.category_name) && (
              <p className="text-muted small mb-0 mt-1">
                {submission.schedule_title || submission.category_name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="alert alert-danger">
        This inspection was <strong>rejected</strong>{reviewNotes && `: "${reviewNotes}"`}.
        {reviewDeadline && (
          <div className="mt-1 small">
            Review deadline:{' '}
            <strong className={deadlinePassed ? 'text-danger' : ''}>
              {new Date(reviewDeadline).toLocaleString()}
            </strong>
            {deadlinePassed && ' — Deadline has passed'}
          </div>
        )}
        {!deadlinePassed && ' Add your remarks below for each question and submit for re-inspection.'}
      </div>

      {deadlinePassed && (
        <div className="alert alert-danger text-center">
          <p className="fw-semibold mb-1">Review deadline has passed</p>
          <p className="small mb-0">
            The deadline was {new Date(reviewDeadline).toLocaleString()}.
            Contact your coordinator or admin to extend the deadline.
          </p>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {!deadlinePassed && (
        <form onSubmit={handleSubmit}>
          {/* Per-question remarks */}
          <div className="mb-4">
            <h2 className="h5 fw-bold mb-3">Add Remarks Per Question</h2>
            {Object.entries(answersToReview).map(([qId, answer]) => (
              <div key={qId} className="card card-body mb-3">
                <p className="fw-semibold mb-1 small">{labelMap[qId] || `Question #${qId}`}</p>
                <p className="text-muted small mb-2">
                  Inspector answered: <strong>{answer}</strong>
                </p>
                <textarea
                  className="form-control"
                  placeholder="Add your remark for this question (optional)…"
                  value={remarks[qId] || ''}
                  onChange={e => setRemarks(prev => ({ ...prev, [qId]: e.target.value }))}
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* Image upload */}
          <div className="mb-4">
            <h2 className="h5 fw-bold mb-3">
              Upload Evidence Images <span className="text-danger">*</span>
            </h2>
            <div className="border border-2 border-dashed rounded p-5 text-center bg-light cursor-pointer"
              onClick={() => document.getElementById('attendeeFileInput').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
              <div className="upload-icon">📷</div>
              <p>Click or drag images here</p>
              <p className="upload-hint">JPEG, PNG, GIF, WEBP — max 10MB each</p>
              <input id="attendeeFileInput" type="file" className="d-none"
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

          <div className="d-flex gap-3 flex-wrap mt-3">
            <button type="submit" className="btn btn-primary"
              disabled={submitting || files.length === 0}>
              {submitting ? 'Submitting Review…' : 'Submit Review for Re-inspection'}
            </button>
            <button type="button" className="btn btn-secondary"
              onClick={() => navigate(`/submissions/${uuid}`)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}




