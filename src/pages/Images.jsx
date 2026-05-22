import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitForm, updateScheduleStatus, updateSubmissionStatus, getScheduleById } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Images() {
  const { slug }                = useParams();
  const navigate                = useNavigate();
  const { role }                = useAuth();
  const [files, setFiles]       = useState([]);
  const [previews, setPreviews] = useState([]);
  const [decision, setDecision] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [schedule, setSchedule]       = useState(null);
  const [attendeeDeadline, setAttendeeDeadline] = useState('');

  const scheduleId  = new URLSearchParams(window.location.search).get('schedule_id');
  const isInspector = ['inspector', 'global_admin', 'local_admin'].includes(role);

  useEffect(() => {
    if (scheduleId) {
      getScheduleById(scheduleId).then(r => setSchedule(r.data)).catch(() => {});
    }
  }, [scheduleId]);

  function handleFiles(selected) {
    const incoming = Array.from(selected);
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const merged = [...prev, ...incoming.filter(f => !existingNames.has(f.name))];
      return merged;
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
    if (files.length === 0) { setError('Please upload at least one image before submitting.'); return; }
    if (isInspector && !decision) { setError('Please approve or reject the inspection before submitting.'); return; }
    if (isInspector && decision === 'rejected' && !attendeeDeadline) {
      setError('Please set a deadline for the attendee to submit their review.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const answers      = JSON.parse(sessionStorage.getItem(`answers_${slug}`) || '{}');
      const params       = new URLSearchParams(window.location.search);
      const locationSlug = params.get('location');
      const scheduleId   = params.get('schedule_id');

      const fd = new FormData();
      fd.append('answers', JSON.stringify(answers));
      if (locationSlug) fd.append('locationSlug', locationSlug);
      if (scheduleId)   fd.append('schedule_id', scheduleId);
      files.forEach(f => fd.append('images', f));

      const { data } = await submitForm(slug, fd);

      if (isInspector && decision) {
        await updateSubmissionStatus(
          data.submissionUuid, decision, reviewNotes,
          decision === 'rejected' ? attendeeDeadline : null
        );
      }

      if (scheduleId) {
        if (data.submissionUuid) localStorage.setItem(`schedule_submission_${scheduleId}`, data.submissionUuid);
        if (decision === 'approved') {
          try { await updateScheduleStatus(scheduleId, 'completed', data.submissionUuid); } catch {}
        }
      }

      sessionStorage.removeItem(`answers_${slug}`);
      navigate(`/submissions/${data.submissionUuid}/thankyou`);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (role === 'inspector' && schedule) {
    const now = Date.now();
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
      <h1 className="h3 fw-bold mb-3">
        Upload Images <span className="text-danger">*</span>
      </h1>

      <div
        className="border border-2 border-dashed rounded p-5 text-center bg-light cursor-pointer"
        onClick={() => document.getElementById('fileInput').click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="upload-icon">📷</div>
        <p>Click or drag images here</p>
        <p className="upload-hint">JPEG, PNG, GIF, WEBP — max 10MB each · select multiple at once</p>
        <input id="fileInput" type="file" className="d-none" multiple accept="image/*"
               onChange={e => handleFiles(e.target.files)} />
      </div>

      {previews.length > 0 && (
        <div className="row row-cols-2 row-cols-md-4 g-3 mt-2">
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

      {/* Inspector decision panel */}
      {isInspector && (
        <div className="card card-body mt-4">
          <h3 className="h6 fw-semibold mb-3">Inspector Decision</h3>

          <div className="mb-3">
            <label className="form-label fw-medium">
              Notes <span className="text-muted fw-normal">(optional)</span>
            </label>
            <textarea
              className="form-control"
              placeholder="Add any observations or reason for rejection…"
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
            />
          </div>

          <div className="d-flex gap-3 mb-2">
            <button
              type="button"
              onClick={() => setDecision('approved')}
              className={`btn flex-fill ${decision === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision('rejected')}
              className={`btn flex-fill ${decision === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
            >
              ✗ Reject
            </button>
          </div>

          {decision && (
            <p className={`small fw-medium mb-0 ${decision === 'approved' ? 'text-success' : 'text-danger'}`}>
              {decision === 'approved' ? '✓ Marked as Approved' : '✗ Marked as Rejected'}
              {' '}
              <span
                className="text-decoration-underline fw-normal"
                style={{ cursor: 'pointer' }}
                onClick={() => { setDecision(null); }}
              >
                Change
              </span>
            </p>
          )}

          {decision === 'rejected' && (
            <div className="mt-3 p-3 rounded border border-warning bg-warning bg-opacity-10">
              <label className="form-label fw-semibold text-danger-emphasis small">
                Attendee Review Deadline <span className="text-danger">*</span>
              </label>
              <p className="text-muted small mb-2">
                Set a deadline by which the attendee must submit their review remarks.
              </p>
              <input
                type="datetime-local"
                className="form-control"
                value={attendeeDeadline}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setAttendeeDeadline(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3">{error}</div>
      )}

      <div className="d-flex gap-3 flex-wrap mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (isInspector && !decision) || (decision === 'rejected' && !attendeeDeadline)}
          className={`btn ${decision === 'rejected' ? 'btn-danger' : 'btn-success'}`}
        >
          {submitting
            ? 'Submitting…'
            : decision === 'approved' ? '✓ Submit Approved Inspection'
            : decision === 'rejected' ? '✗ Submit Rejected Inspection'
            : 'Submit Inspection'}
        </button>
      </div>
    </div>
  );
}




