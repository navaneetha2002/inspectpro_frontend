import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitForm, updateScheduleStatus, updateSubmissionStatus } from '../api/api';
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

  const isInspector = ['inspector', 'global_admin', 'local_admin'].includes(role);

  function handleFiles(selected) {
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isInspector && !decision) {
      setError('Please approve or reject the inspection before submitting.');
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
        await updateSubmissionStatus(data.submissionUuid, decision, reviewNotes);
      }

      if (scheduleId) {
        if (data.submissionUuid) {
          localStorage.setItem(`schedule_submission_${scheduleId}`, data.submissionUuid);
        }
        try {
          await updateScheduleStatus(scheduleId, 'completed', data.submissionUuid);
        } catch (err) {
          console.error('Failed to update schedule after submission:', err);
        }
      }

      sessionStorage.removeItem(`answers_${slug}`);
      navigate(`/submissions/${data.submissionUuid}/thankyou`);

    } catch (err) {
      console.error('Submission failed:', err);
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Upload Images</h1>

      <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
        <div className="upload-icon">📷</div>
        <p>Click or drag images here</p>
        <p className="upload-hint">JPEG, PNG, GIF, WEBP — max 10MB each</p>
        <input id="fileInput" type="file" className="file-input" multiple accept="image/*"
               onChange={e => handleFiles(e.target.files)} />
      </div>

      {previews.length > 0 && (
        <div className="preview-grid">
          {previews.map((src, i) => (
            <div key={i} className="preview-item">
              <img src={src} alt={files[i].name} />
              <span>{files[i].name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Inspector decision panel */}
      {isInspector && (
        <div style={{
          marginTop: '2rem', padding: '1.25rem',
          border: '1px solid #e2e8f0', borderRadius: '10px',
          background: '#f8fafc',
        }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>
            Inspector Decision
          </h3>

          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 500 }}>
            Notes <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            className="form-input form-textarea"
            placeholder="Add any observations or reason for rejection…"
            value={reviewNotes}
            onChange={e => setReviewNotes(e.target.value)}
            style={{ marginBottom: '1rem', width: '100%' }}
          />

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setDecision('approved')}
              style={{
                flex: 1, padding: '0.65rem',
                background: decision === 'approved' ? '#16a34a' : '#f0fdf4',
                color: decision === 'approved' ? '#fff' : '#16a34a',
                border: '2px solid #16a34a', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision('rejected')}
              style={{
                flex: 1, padding: '0.65rem',
                background: decision === 'rejected' ? '#dc2626' : '#fef2f2',
                color: decision === 'rejected' ? '#fff' : '#dc2626',
                border: '2px solid #dc2626', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
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
                onClick={() => setDecision(null)}
              >
                Change
              </span>
            </p>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem', marginTop: '1rem', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b',
        }}>
          {error}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (isInspector && !decision)}
          style={{
            opacity: (submitting || (isInspector && !decision)) ? 0.5 : 1,
            cursor: (submitting || (isInspector && !decision)) ? 'not-allowed' : 'pointer',
          }}
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