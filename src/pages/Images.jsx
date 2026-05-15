import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitForm, updateScheduleStatus, updateSubmissionStatus} from '../api/api';

export default function Images() {
  const { slug }        = useParams();
  const navigate        = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
   const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

   // Read the inspector's decision saved by Form.jsx (null for regular users)
  const decisionRaw = sessionStorage.getItem(`decision_${slug}`);
  const decision    = decisionRaw ? JSON.parse(decisionRaw) : null;
  // decision shape: { status: 'approved' | 'rejected', review_notes: string }

  function handleFiles(selected) {
    const arr = Array.from(selected);
    setFiles(arr);
    setPreviews(arr.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
     try {
    const answers = JSON.parse(sessionStorage.getItem(`answers_${slug}`) || '{}');
    const params     = new URLSearchParams(window.location.search);
    const locationSlug = params.get('location');
    const scheduleId   = params.get('schedule_id');
    const fd = new FormData();
    fd.append('answers', JSON.stringify(answers));
    if (locationSlug) fd.append('locationSlug', locationSlug);
    if (scheduleId)   fd.append('schedule_id', scheduleId);
    files.forEach(f => fd.append('images', f));

    const { data } = await submitForm(slug, fd);

    if (decision?.status) {
        await updateSubmissionStatus(
          data.submissionUuid,
          decision.status,
          decision.review_notes || ''
        );
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
    sessionStorage.removeItem(`decision_${slug}`);
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
      {/* ── Inspector decision badge ─────────────────────────────────────── */}
      {decision && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '10px',
          background: decision.status === 'approved' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${decision.status === 'approved' ? '#86efac' : '#fca5a5'}`,
        }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>
            {decision.status === 'approved' ? '✅' : '❌'}
          </span>
          <div>
            <p style={{
              margin: 0, fontWeight: 600,
              color: decision.status === 'approved' ? '#166534' : '#991b1b',
            }}>
              Marked as {decision.status === 'approved' ? 'Approved' : 'Rejected'}
            </p>
            {decision.review_notes && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#475569' }}>
                {decision.review_notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b',
        }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
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
        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button
            type="submit"
            className={`btn ${decision?.status === 'rejected' ? 'btn-danger' : 'btn-success'}`}
            disabled={submitting}
            style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting
              ? 'Submitting…'
              : decision?.status === 'approved' ? '✓ Submit Approved Inspection'
              : decision?.status === 'rejected' ? '✗ Submit Rejected Inspection'
              : 'Submit Inspection'}
          </button>
        </div>
      </form>
    </div>
  );
}